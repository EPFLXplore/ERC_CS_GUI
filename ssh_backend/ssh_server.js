// SSH2
const { Client } = require('ssh2');
let activeConnection = 0
const connections = {}

const os = require('os');
const fs = require('fs');
const path = require('path');

const SCREENSHOTS_DIR = path.join(__dirname, '..', '..', 'screenshots');

// ExpressJS
const express = require('express');
const { execFile, spawn } = require('child_process');
const dgram = require('dgram');
const net = require('net');
const http = require('http');
const axios = require('axios');
const app = express();

// Screenshots are posted as a base64 data URL, which busts express.json()'s 100kb default: a
// 1080p canvas.toDataURL("image/jpeg", 0.9) is a few hundred kB before base64 adds a further
// third, so the save failed with PayloadTooLarge on any frame with real detail in it.
//
// Mounted BEFORE the global parser on purpose. express.json() marks the request as parsed, so
// whichever parser runs first wins -- leaving this until the route is declared would just let the
// 100kb parser below reject the body first. Scoped to the one path that needs it so every other
// endpoint keeps the tight default.
app.use('/save-screenshot', express.json({ limit: '25mb' }));

app.use(express.json());

/** Shown top → bottom in the CS header (ping every host each poll). */
const LINK_PING_HOSTS = ['169.254.55.230', '169.254.55.231'];

/** RouterOS REST API (antenna mast AP) for WiFi signal strength. */
const WIFI_ROUTER_HOST = '169.254.55.1';
const WIFI_ROUTER_AUTH = { username: 'admin', password: 'XploreAntenna3' };
const WIFI_ANTENNA_MAC = 'D4:01:C3:DC:B9:78';

// Cors
const cors = require('cors');
// exposedHeaders: the MSE player has to read the codec string off the .mp4 response before it can
// create a SourceBuffer, and CORS hides non-simple response headers from JS by default.
app.use(cors({ exposedHeaders: ['X-Video-Codec'] }));

/** Mirrored in frontend/src/pages/cameras/index.tsx (CAMERA_DEFS[].gstPort) — keep in sync. */
const CAMERA_GST_PORTS = {
  nav_back: 5000,
  nav_left: 5002,
  nav_right: 5004,
  nav_front: 5006,
  cs_top: 5008,
  cs_right_steer: 5010,
  cs_left_steer: 5012,
  hd_gripper: 5013,
  drill_inside: 5016,
  microscope: 5014,
};

/**
 * Transport per camera. `mjpeg` is the original path: a Node UDP proxy counts packets, then gst
 * decodes H.264 and re-encodes JPEG for an <img>.
 *
 * `fmp4` is the low-overhead path. It removes the proxy — gst's udpsrc binds the rover's port
 * itself, so no JavaScript callback and no second syscall run per RTP packet — and it removes the
 * transcode, muxing the original H.264 into fragmented MP4 for an MSE <video>. That matches, element
 * for element, a bare `gst-launch ... ! avdec_h264 ! autovideosink` against the same port, which is
 * stable where the CS was not.
 *
 * The two cannot coexist for one camera: a single pipeline owns the UDP port.
 * Mirrored in frontend/src/pages/cameras/index.tsx (CAMERA_TRANSPORTS) — keep in sync.
 *
 * Currently empty: hd_gripper was on `fmp4` but the MSE live-edge buffer added more latency than
 * it saved, so it is back on the shared mjpeg path (identical receive pipeline to the NAV cams).
 * The fmp4 machinery below is left intact for future use.
 */
const CAMERA_TRANSPORTS = {};

function getCameraTransport(cameraId) {
  return CAMERA_TRANSPORTS[cameraId] || 'mjpeg';
}

const cameraStreams = new Map();
const cameraStats = new Map();
const FIRST_FRAME_TIMEOUT_MS = 2500;
/**
 * An fmp4 client cannot be served until gst has emitted ftyp+moov, and mp4mux cannot emit those
 * until the rover sends a keyframe — so the honest bound here is "longer than the worst plausible
 * GOP", not "a couple of seconds". At 5 s any rover with a keyframe interval above that would 503
 * every client forever while the stream was perfectly healthy.
 *
 * Still bounded, because parking a client on a stream that genuinely never produces anything is what
 * stops the linger timer from ever reclaiming it.
 */
const FMP4_INIT_TIMEOUT_MS = 30000;
/** Output stopped after it had been flowing: the pipeline is wedged, kill it so a reconnect rebuilds
 *  it. Only meaningful once a first segment exists — see FMP4_FIRST_SEGMENT_TIMEOUT_MS. */
const FMP4_STALL_TIMEOUT_MS = 5000;
/** Nothing produced *yet*. Distinct from the above because waiting on the first keyframe of a long
 *  GOP is normal, and killing the pipeline for it restarts the wait — forever. */
const FMP4_FIRST_SEGMENT_TIMEOUT_MS = 30000;
/** A client queued further behind than this cannot catch up on a live stream; drop it and let it
 *  reconnect at the live edge. Roughly a second of the gripper at its 4000 kbps maximum. */
const FMP4_MAX_CLIENT_BACKLOG_BYTES = 4 * 1024 * 1024;
const CAMERA_STATS_WINDOW_MS = 1000;
const CAMERA_ACTIVE_TIMEOUT_MS = 2000;
const INTERNAL_GST_PORT_OFFSET = 10000;
/** Mirrored in frontend/src/pages/cameras/index.tsx — keep in sync. */
const CAMERA_HTTP_PORT_OFFSET = 20000;
const CAMERA_STATS_BUCKET_MS = 100;
const CAMERA_STATS_BUCKET_COUNT = 12;
const CAMERA_STATS_WINDOW_BUCKETS = CAMERA_STATS_WINDOW_MS / CAMERA_STATS_BUCKET_MS;
/** Keeping the last client's pipeline alive briefly avoids an EADDRINUSE race when a re-render
 *  immediately re-requests the same camera. */
const CAMERA_STREAM_LINGER_MS = 3000;
const CAMERA_CLIENT_BLOCKED_WARN_MS = 10000;
const IPV4_HEADER_BYTES = 20;
const UDP_HEADER_BYTES = 8;
const ETHERNET_HEADER_BYTES = 14;
const ETHERNET_FCS_BYTES = 4;
const ETHERNET_PREAMBLE_SFD_BYTES = 8;
const ETHERNET_INTER_FRAME_GAP_BYTES = 12;
const ETHERNET_MIN_FRAME_BYTES = 64;

function getInternalGstPort(publicPort) {
  return publicPort + INTERNAL_GST_PORT_OFFSET;
}

function getCameraHttpPort(publicPort) {
  return publicPort + CAMERA_HTTP_PORT_OFFSET;
}

function estimateWireBytes(udpPayloadBytes) {
  const ethernetFrameBytes =
    ETHERNET_HEADER_BYTES +
    IPV4_HEADER_BYTES +
    UDP_HEADER_BYTES +
    udpPayloadBytes +
    ETHERNET_FCS_BYTES;
  return (
    Math.max(ETHERNET_MIN_FRAME_BYTES, ethernetFrameBytes) +
    ETHERNET_PREAMBLE_SFD_BYTES +
    ETHERNET_INTER_FRAME_GAP_BYTES
  );
}

/** Refreshed on a timer so the RTP hot path never calls Date.now(). 20 ms is far finer than
 *  anything the stats window resolves. */
let coarseNowMs = Date.now();
setInterval(() => {
  coarseNowMs = Date.now();
}, 20).unref();

function getCameraStats(cameraId) {
  let stats = cameraStats.get(cameraId);
  if (!stats) {
    // Ring of fixed-width time buckets: recording a packet is O(1) and allocation-free, which
    // matters because this runs for every RTP packet of every camera on the same event loop that
    // has to drain the MJPEG sockets.
    stats = {
      bucketId: new Float64Array(CAMERA_STATS_BUCKET_COUNT).fill(-1),
      packets: new Float64Array(CAMERA_STATS_BUCKET_COUNT),
      payload: new Float64Array(CAMERA_STATS_BUCKET_COUNT),
      wire: new Float64Array(CAMERA_STATS_BUCKET_COUNT),
      lastPacketAt: 0,
    };
    cameraStats.set(cameraId, stats);
  }
  return stats;
}

function recordCameraPacket(stats, udpPayloadBytes, now) {
  // Math.floor, not `| 0`: Date.now() / 100 is well past 2^31.
  const id = Math.floor(now / CAMERA_STATS_BUCKET_MS);
  const i = id % CAMERA_STATS_BUCKET_COUNT;
  if (stats.bucketId[i] !== id) {
    stats.bucketId[i] = id;
    stats.packets[i] = 0;
    stats.payload[i] = 0;
    stats.wire[i] = 0;
  }
  stats.packets[i] += 1;
  stats.payload[i] += udpPayloadBytes;
  stats.wire[i] += estimateWireBytes(udpPayloadBytes);
  stats.lastPacketAt = now;
}

/**
 * Packets the kernel threw away because the receive buffer was full.
 *
 * This is the number that matters and that the CS has never shown. The proxy's own counters are
 * incremented inside `rx.on('message')`, so anything dropped before that callback — exactly what
 * happens when the event loop stalls — was invisible, and the UI would report a healthy Mbps while
 * the stream was being shredded. udpsrc's socket has the same exposure, so read it from the kernel.
 */
function readUdpSocketDrops(port) {
  const hexPort = port.toString(16).toUpperCase().padStart(4, '0');
  for (const file of ['/proc/net/udp', '/proc/net/udp6']) {
    let text;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch (_) {
      continue;
    }
    for (const line of text.split('\n').slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 13) continue;
      if (!cols[1].endsWith(`:${hexPort}`)) continue;
      const drops = Number(cols[cols.length - 1]);
      if (Number.isFinite(drops)) return drops;
    }
  }
  return null;
}

/** fmp4 cameras have no proxy counting packets, so the readout comes from the muxed byte stream
 *  instead. Payload rather than wire bytes — there is no per-packet accounting left to derive
 *  Ethernet overhead from — plus the kernel drop counter, which is the more useful half anyway. */
function buildFmp4StatsEntry(cameraId, port, now) {
  const stream = cameraStreams.get(cameraId);
  const elapsed = stream ? Math.max(1, now - (stream.bytesWindowAt || now)) : 1;
  let mbps = 0;
  if (stream) {
    mbps = ((stream.bytesOut - (stream.bytesWindowBase || 0)) * 8) / elapsed / 1000;
    stream.bytesWindowAt = now;
    stream.bytesWindowBase = stream.bytesOut;
  }
  const lastAgeMs = stream && stream.lastSegmentAt > 0 ? now - stream.lastSegmentAt : null;
  return {
    port,
    transport: 'fmp4',
    mbps: Number(mbps.toFixed(3)),
    packetsPerSec: 0,
    payloadMbps: Number(mbps.toFixed(3)),
    overheadMbps: 0,
    active: lastAgeMs !== null && lastAgeMs <= CAMERA_ACTIVE_TIMEOUT_MS,
    lastPacketAgeMs: lastAgeMs,
    drops: readUdpSocketDrops(port),
    codec: stream ? stream.codec : null,
    relay: buildRelaySnapshot(cameraId),
  };
}

function buildCameraStatsSnapshot() {
  const now = Date.now();
  const oldestBucketId = Math.floor(now / CAMERA_STATS_BUCKET_MS) - CAMERA_STATS_WINDOW_BUCKETS;
  const out = {};
  for (const [cameraId, port] of Object.entries(CAMERA_GST_PORTS)) {
    if (getCameraTransport(cameraId) === 'fmp4') {
      out[cameraId] = buildFmp4StatsEntry(cameraId, port, now);
      continue;
    }
    const stats = getCameraStats(cameraId);
    let packetCount = 0;
    let payloadBytes = 0;
    let wireBytes = 0;
    for (let i = 0; i < CAMERA_STATS_BUCKET_COUNT; i++) {
      if (stats.bucketId[i] > oldestBucketId) {
        packetCount += stats.packets[i];
        payloadBytes += stats.payload[i];
        wireBytes += stats.wire[i];
      }
    }
    const overheadBytes = Math.max(0, wireBytes - payloadBytes);
    const lastPacketAgeMs = stats.lastPacketAt > 0 ? now - stats.lastPacketAt : null;
    const active = lastPacketAgeMs !== null && lastPacketAgeMs <= CAMERA_ACTIVE_TIMEOUT_MS;
    out[cameraId] = {
      port,
      mbps: Number(((wireBytes * 8) / CAMERA_STATS_WINDOW_MS / 1000).toFixed(3)),
      packetsPerSec: packetCount,
      payloadMbps: Number(((payloadBytes * 8) / CAMERA_STATS_WINDOW_MS / 1000).toFixed(3)),
      overheadMbps: Number(((overheadBytes * 8) / CAMERA_STATS_WINDOW_MS / 1000).toFixed(3)),
      active,
      lastPacketAgeMs,
      drops: readUdpSocketDrops(port),
      relay: buildRelaySnapshot(cameraId),
    };
  }
  return out;
}

/** Exposes whether the relay is dropping frames. framesDropped staying at 0 in steady state is
 *  what distinguishes a healthy stream from one that merely traded latency for choppiness. */
function buildRelaySnapshot(cameraId) {
  const stream = cameraStreams.get(cameraId);
  if (!stream) return { clients: 0, framesSent: 0, framesDropped: 0, blockedMs: 0, queuedBytes: 0 };
  let framesSent = 0;
  let framesDropped = 0;
  let blockedMs = 0;
  let queuedBytes = 0;
  const now = Date.now();
  for (const client of stream.clients) {
    framesSent += client.sent;
    framesDropped += client.dropped;
    if (client.blocked) blockedMs = Math.max(blockedMs, now - client.blockedSince);
    if (client.res.socket) queuedBytes += client.res.socket.writableLength || 0;
  }
  return { clients: stream.clients.size, framesSent, framesDropped, blockedMs, queuedBytes };
}

function startCameraUdpProxy(cameraId, publicPort) {
  const internalPort = getInternalGstPort(publicPort);
  // Separate rx/tx sockets: a send error must not tear down the port we receive the rover's RTP on.
  const rx = dgram.createSocket({ type: 'udp4', recvBufferSize: 4 * 1024 * 1024 });
  const tx = dgram.createSocket('udp4');
  const stats = getCameraStats(cameraId);
  const proxy = {
    socket: rx,
    tx,
    publicPort,
    internalPort,
    ready: false,
    txReady: false,
  };

  rx.on('message', (msg) => {
    recordCameraPacket(stats, msg.length, coarseNowMs);
    // Connected socket + no callback: send() skips the dns.lookup/nextTick path it would take for
    // an explicit address, which at ~3k packets/s per camera is the difference that lets this
    // event loop stay responsive enough to drain the MJPEG sockets.
    if (proxy.txReady) tx.send(msg);
  });

  rx.on('listening', () => {
    proxy.ready = true;
    console.log(`[camera-streams] ${cameraId}: proxying UDP ${publicPort} -> 127.0.0.1:${internalPort}`);
  });

  rx.on('error', (err) => {
    console.error(`[camera-streams] ${cameraId}: UDP proxy error on ${publicPort}: ${err.message}`);
    try {
      rx.close();
    } catch (_) {}
  });

  tx.on('error', (err) => {
    console.error(`[camera-streams] ${cameraId}: UDP proxy send failed: ${err.message}`);
  });
  tx.on('connect', () => {
    proxy.txReady = true;
  });
  tx.bind(0, () => {
    try {
      tx.connect(internalPort, '127.0.0.1');
    } catch (err) {
      console.error(`[camera-streams] ${cameraId}: UDP proxy connect failed: ${err.message}`);
    }
  });

  rx.bind(publicPort);
  return proxy;
}

const CAMERA_BOUNDARY = 'ThisRandomString';
const PART_PREFIX = Buffer.from(`--${CAMERA_BOUNDARY}`);
const HEADER_END = Buffer.from('\r\n\r\n');
const CONTENT_LENGTH_RE = /content-length:\s*(\d+)/i;
const MAX_HEADER_BYTES = 512;
const MAX_PART_BYTES = 16 * 1024 * 1024;

function buildGstReceiveArgs(port) {
  return [
    '-q',
    'udpsrc',
    `port=${port}`,
    'buffer-size=2097152',
    'caps=application/x-rtp,media=video,clock-rate=90000,encoding-name=H264,payload=96',
    '!',
    // Decouples socket reads from the decoder. Must be large: leaking raw RTP corrupts H.264
    // until the next IDR, so this is a memory guard, not a drop point.
    'queue',
    'max-size-buffers=1000',
    'max-size-bytes=0',
    'max-size-time=0',
    'leaky=downstream',
    '!',
    'rtpjitterbuffer',
    'latency=50',
    'drop-on-latency=true',
    '!',
    'rtph264depay',
    '!',
    'h264parse',
    '!',
    'avdec_h264',
    '!',
    // The real drop point. Decoded frames carry no reference dependencies, so discarding the
    // oldest here is visually free when jpegenc/videoconvert falls behind. max-size-bytes=0 is
    // required or the 2 MB default trips before the buffer count on 720p I420.
    'queue',
    'max-size-buffers=2',
    'max-size-bytes=0',
    'max-size-time=0',
    'leaky=downstream',
    '!',
    'videoconvert',
    '!',
    'jpegenc',
    'quality=60',
    '!',
    'queue',
    'max-size-buffers=3',
    'max-size-bytes=0',
    'max-size-time=0',
    'leaky=downstream',
    '!',
    'multipartmux',
    `boundary=${CAMERA_BOUNDARY}`,
    '!',
    'fdsink',
    'fd=1',
    'sync=false',
  ];
}

/**
 * nav_front (ZED) receive pipeline: same shape as buildGstReceiveArgs, tuned to hide packet loss
 * rather than to minimise latency.
 *
 * What differs, and why:
 * - no queue between udpsrc and rtpjitterbuffer. The jitterbuffer is the thing that reorders and
 *   times out RTP, so buffering ahead of it only delays that decision; the shared pipeline keeps
 *   its 1000-buffer queue as a memory guard, this one lets the jitterbuffer own the socket side.
 * - latency=100 (vs 50) plus do-lost/max-dropout-time/max-misorder-time: twice the reordering
 *   window, and explicit GAP events downstream so the decoder is told a packet is gone instead of
 *   inferring it from a broken bitstream.
 * - wait-for-keyframe + output-corrupt=false: after a loss, show nothing until the next IDR rather
 *   than the smeared macroblocks the shared pipeline would push through. Costs up to one GOP of
 *   black on recovery, which is the trade this camera wants.
 *
 * Keep the two in sync when changing anything that is not on that list.
 */
function buildGstFrontReceiveArgs(port) {
  return [
    '-q',
    'udpsrc',
    `port=${port}`,
    'buffer-size=2097152',
    'caps=application/x-rtp,media=video,clock-rate=90000,encoding-name=H264,payload=96',
    '!',
    'rtpjitterbuffer',
    'latency=100',
    'drop-on-latency=true',
    'do-lost=true',
    'max-dropout-time=1000',
    'max-misorder-time=100',
    '!',
    'rtph264depay',
    'wait-for-keyframe=true',
    '!',
    'h264parse',
    '!',
    'avdec_h264',
    'output-corrupt=false',
    '!',
    // The real drop point, as in the shared pipeline: decoded frames carry no reference
    // dependencies, so dropping the oldest when jpegenc falls behind is visually free.
    'queue',
    'max-size-buffers=2',
    'max-size-bytes=0',
    'max-size-time=0',
    'leaky=downstream',
    '!',
    'videoconvert',
    '!',
    'jpegenc',
    'quality=60',
    '!',
    'queue',
    'max-size-buffers=2',
    'max-size-bytes=0',
    'max-size-time=0',
    'leaky=downstream',
    '!',
    'multipartmux',
    `boundary=${CAMERA_BOUNDARY}`,
    '!',
    'fdsink',
    'fd=1',
    'sync=false',
  ];
}

/** Only nav_front has its own mjpeg tuning; every other camera uses the shared pipeline. */
function buildGstMjpegArgs(cameraId, port) {
  if (cameraId === 'nav_front') return buildGstFrontReceiveArgs(port);
  return buildGstReceiveArgs(port);
}

/**
 * fmp4 receive pipeline. The half above rtph264depay is deliberately identical to the mjpeg one —
 * and to the bare gst-launch that runs stably by hand — so the only variable is what happens after
 * depayloading. From there the H.264 is muxed, not decoded: no avdec_h264, no videoconvert, no
 * jpegenc, which is the entire point.
 *
 * fragment-duration=20 (ms) is below one frame interval at the rover's 15 fps, so mp4mux emits one
 * moof/mdat per frame and adds no batching latency of its own. Measured on GStreamer 1.20.3.
 *
 * Deliberately NOT set here: `rtph264depay wait-for-keyframe=true`. Paired with do-lost it makes the
 * depayloader discard everything until an intact keyframe, and a keyframe spans enough RTP packets
 * that on a lossy link the condition is rarely met. Measured against an identical impaired stream it
 * cost 86 % of frames at 2 % loss and produced no output at all at 5 %, where the settings below
 * were unaffected.
 *
 * `latency=50` is unchanged pending measurement on the real link: rtpjitterbuffer's `stats` property
 * reports num-late and avg-jitter, and that — not a guess about frame intervals — is what should
 * decide the budget. Raising it without evidence is pure added delay on a teleoperation feed.
 */
function buildGstFmp4Args(port) {
  return [
    '-q',
    'udpsrc',
    `port=${port}`,
    'buffer-size=2097152',
    'caps=application/x-rtp,media=video,clock-rate=90000,encoding-name=H264,payload=96',
    '!',
    // Memory guard between the socket and the jitterbuffer, not a drop point. 200 buffers is ample
    // for a stream that fragments frames into ~11 packets at mtu=1200, and bounds the damage a leak
    // can do — leaked RTP corrupts H.264 until the next IDR.
    'queue',
    'max-size-buffers=200',
    'max-size-bytes=0',
    'max-size-time=0',
    'leaky=downstream',
    '!',
    'rtpjitterbuffer',
    'latency=50',
    'drop-on-latency=true',
    // Emits a gap event downstream on loss instead of silently splicing across the hole.
    'do-lost=true',
    '!',
    'rtph264depay',
    '!',
    // rtph264depay already advertises alignment=au; stating it makes the contract mp4mux depends on
    // explicit, since the muxer needs whole access units and fails hard rather than degrading.
    'video/x-h264,alignment=au',
    '!',
    'h264parse',
    '!',
    'mp4mux',
    'fragment-duration=20',
    'streamable=true',
    '!',
    'fdsink',
    'fd=1',
    'sync=false',
  ];
}

/**
 * Splits gst's stdout into an MP4 init segment plus one media segment per fragment.
 *
 * ISO-BMFF boxes are length-prefixed (`size:u32, type:4cc`), so like the multipart parser this is
 * pure arithmetic — no body byte is scanned. Everything before the first `moof` is ftyp+moov, the
 * init segment every MSE client needs before any fragment; each `moof` and the boxes up to the next
 * `moof` form one appendable media segment.
 */
function createFmp4Segmenter(onInit, onSegment) {
  let buf = Buffer.alloc(0);
  let sawInit = false;
  let segStart = -1; // offset of the moof opening the segment being accumulated
  let scan = 0; // boxes before this are already parsed; never walked twice

  const reset = () => {
    buf = Buffer.alloc(0);
    segStart = -1;
    scan = 0;
  };

  return function push(chunk) {
    buf = buf.length === 0 ? chunk : Buffer.concat([buf, chunk]);

    for (;;) {
      if (buf.length - scan < 8) break;
      let size = buf.readUInt32BE(scan);
      const type = buf.toString('latin1', scan + 4, scan + 8);
      let header = 8;
      if (size === 1) {
        // 64-bit largesize. mp4mux will not emit one at these fragment sizes, but a stream that is
        // not what we think it is must not be able to spin this loop.
        if (buf.length - scan < 16) break;
        if (buf.readUInt32BE(scan + 8) !== 0) return reset();
        size = buf.readUInt32BE(scan + 12);
        header = 16;
      }
      if (size < header) return reset();
      if (buf.length - scan < size) break;

      if (type === 'moof') {
        if (!sawInit) {
          sawInit = true;
          onInit(Buffer.from(buf.slice(0, scan))); // ftyp + moov
        } else if (segStart >= 0) {
          onSegment(Buffer.from(buf.slice(segStart, scan)));
        }
        segStart = scan;
      }
      scan += size;
    }

    // Drop what can never be needed again: bytes before the open segment, or before the scan cursor
    // when no segment is open. Nothing may be dropped before the first moof — everything up to it
    // *is* the init segment, and trimming ftyp/moov as they are parsed would leave it empty.
    const keep = !sawInit ? 0 : segStart >= 0 ? segStart : scan;
    if (keep > 0) {
      buf = Buffer.from(buf.slice(keep));
      scan -= keep;
      if (segStart >= 0) segStart = 0;
    }
  };
}

/** avcC carries configurationVersion, then the three bytes MSE wants as `avc1.PPCCLL`. Without the
 *  right profile/level string addSourceBuffer throws and nothing plays. */
function parseAvcCodec(initSegment) {
  const at = initSegment.indexOf('avcC', 0, 'latin1');
  if (at < 0 || at + 8 > initSegment.length) return null;
  const profile = initSegment[at + 5];
  const compat = initSegment[at + 6];
  const level = initSegment[at + 7];
  return `avc1.${profile.toString(16).padStart(2, '0')}${compat
    .toString(16)
    .padStart(2, '0')}${level.toString(16).padStart(2, '0')}`;
}

/**
 * Splits gst's stdout into whole multipart parts so the relay can drop frames instead of queueing
 * them. multipartmux emits an authoritative Content-Length, so a part's end is arithmetic and no
 * body byte is ever scanned. Each emitted buffer is self-contained
 * (`--boundary\r\nheaders\r\n\r\n<jpeg>\r\n`), so dropping any subset still yields a valid stream.
 */
function createMultipartParser(onPart, onDesync) {
  let buf = Buffer.alloc(0);
  let need = -1;

  function resync() {
    const at = buf.indexOf(PART_PREFIX, 1);
    buf = at < 0 ? Buffer.alloc(0) : Buffer.from(buf.slice(at));
    need = -1;
    onDesync();
  }

  return function push(chunk) {
    buf = buf.length === 0 ? chunk : Buffer.concat([buf, chunk]);
    for (;;) {
      if (need < 0) {
        if (buf.length < PART_PREFIX.length) return;
        if (buf.compare(PART_PREFIX, 0, PART_PREFIX.length, 0, PART_PREFIX.length) !== 0) {
          resync();
          continue;
        }
        const hdrEnd = buf.indexOf(HEADER_END);
        if (hdrEnd < 0) {
          if (buf.length > MAX_HEADER_BYTES) resync();
          return;
        }
        const m = CONTENT_LENGTH_RE.exec(buf.toString('latin1', 0, hdrEnd));
        if (!m) {
          resync();
          continue;
        }
        const bodyLen = Number(m[1]);
        if (!(bodyLen > 0) || bodyLen > MAX_PART_BYTES) {
          resync();
          continue;
        }
        need = hdrEnd + HEADER_END.length + bodyLen + 2;
      }
      if (buf.length < need) return;
      if (buf[need - 2] !== 0x0d || buf[need - 1] !== 0x0a) {
        resync();
        continue;
      }
      const part = buf.slice(0, need);
      // Copy the small leftover rather than the part; the part's view keeps its parent alive, so a
      // client holding one pending frame retains at most one extra frame of memory.
      buf = Buffer.from(buf.slice(need));
      need = -1;
      onPart(part);
    }
  };
}

/**
 * Latest-frame-wins. A JPEG dwarfs the 16 KB socket highWaterMark, so res.write() returns false on
 * essentially every frame: `false` means "don't start another frame until drain", not "drop". On a
 * healthy socket drain fires well within a frame interval, so nothing is dropped; frames are only
 * superseded when they genuinely arrive faster than the client can take them.
 */
function writeFrame(client, part) {
  if (client.closed) return;
  if (client.blocked) {
    if (client.pending) client.dropped++;
    client.pending = part;
    return;
  }
  flushFrame(client, part);
}

function flushFrame(client, part) {
  if (client.firstFrameTimer) {
    clearTimeout(client.firstFrameTimer);
    client.firstFrameTimer = null;
  }
  if (!client.res.headersSent) {
    client.res.writeHead(200, {
      'Content-Type': `multipart/x-mixed-replace; boundary=${CAMERA_BOUNDARY}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      Connection: 'close',
    });
  }
  client.sent++;
  if (!client.res.write(part)) {
    client.blocked = true;
    client.blockedSince = Date.now();
  }
}

/**
 * fMP4 fragments are reference-dependent, so the latest-frame-wins trick `writeFrame` uses for JPEG
 * is not available: dropping one fragment corrupts every frame that references it. Write straight
 * through and let TCP apply backpressure. A client whose socket queue runs away is beyond catching
 * up, so cut it loose — the player reconnects and resumes at the live edge, which is far better than
 * feeding it an ever-growing backlog.
 */
function writeSegment(client, segment) {
  if (client.closed) return;
  const socket = client.res.socket;
  if (socket && socket.writableLength > FMP4_MAX_CLIENT_BACKLOG_BYTES) {
    console.warn(
      `[camera-streams] ${client.cameraId}: fMP4 client ${socket.writableLength}B behind, dropping it`
    );
    socket.destroy();
    return;
  }
  client.sent++;
  client.res.write(segment);
}

function stopCameraStream(cameraId) {
  const stream = cameraStreams.get(cameraId);
  if (!stream) return;
  cameraStreams.delete(cameraId);
  if (stream.stopTimer) {
    clearTimeout(stream.stopTimer);
    stream.stopTimer = null;
  }
  if (stream.stallTimer) {
    clearInterval(stream.stallTimer);
    stream.stallTimer = null;
  }
  if (stream.proxy) {
    for (const socket of [stream.proxy.socket, stream.proxy.tx]) {
      try {
        if (socket) socket.close();
      } catch (_) {}
    }
  }
  try {
    stream.process.kill('SIGTERM');
  } catch (_) {}
}

/** dgram close is async, so tearing the pipeline down the instant the last client leaves races a
 *  re-render into EADDRINUSE. Give it a grace period instead. */
function scheduleStopCameraStream(cameraId) {
  const stream = cameraStreams.get(cameraId);
  if (!stream || stream.stopTimer) return;
  stream.stopTimer = setTimeout(() => {
    stream.stopTimer = null;
    if (stream.clients.size === 0) stopCameraStream(cameraId);
  }, CAMERA_STREAM_LINGER_MS);
}

function getCameraStream(cameraId) {
  const existing = cameraStreams.get(cameraId);
  if (existing) {
    if (existing.stopTimer) {
      clearTimeout(existing.stopTimer);
      existing.stopTimer = null;
    }
    return existing;
  }

  const port = CAMERA_GST_PORTS[cameraId];
  if (!port) return null;
  const transport = getCameraTransport(cameraId);
  const fmp4 = transport === 'fmp4';

  // fmp4 has no proxy: gst binds the rover's port itself, which is the whole point — it takes the
  // JS callback and the extra syscall per RTP packet out of the path. udpsrc sets SO_REUSEADDR by
  // default, so respawning after a kill rebinds without the EADDRINUSE dance dgram needs.
  const proxy = fmp4 ? null : startCameraUdpProxy(cameraId, port);
  const gstPort = fmp4 ? port : proxy.internalPort;

  const gst = spawn(
    'gst-launch-1.0',
    fmp4 ? buildGstFmp4Args(gstPort) : buildGstMjpegArgs(cameraId, gstPort),
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  const stream = {
    process: gst,
    proxy,
    transport,
    clients: new Set(),
    hasData: false,
    stopTimer: null,
    // fmp4 only
    initSegment: null,
    codec: null,
    startedAt: Date.now(),
    lastSegmentAt: 0,
    stallTimer: null,
    bytesOut: 0,
    onInit: new Set(),
  };
  cameraStreams.set(cameraId, stream);

  if (fmp4) {
    stream.stallTimer = setInterval(() => {
      if (stream.clients.size === 0) return;
      // Two different situations, and conflating them is fatal: a pipeline that has never produced
      // anything is usually just waiting for the rover's next keyframe, and killing it restarts
      // that wait from zero — a loop that never resolves on a long GOP. Only a pipeline that was
      // producing and then stopped is actually wedged.
      const waitingForFirst = stream.lastSegmentAt === 0;
      const since = Date.now() - (waitingForFirst ? stream.startedAt : stream.lastSegmentAt);
      const budget = waitingForFirst ? FMP4_FIRST_SEGMENT_TIMEOUT_MS : FMP4_STALL_TIMEOUT_MS;
      if (since < budget) return;
      console.warn(
        `[camera-streams] ${cameraId}: no fMP4 output for ${since}ms (${
          waitingForFirst ? 'never started' : 'stalled'
        }), restarting pipeline`
      );
      stopCameraStream(cameraId);
    }, 1000);

    gst.stdout.on(
      'data',
      createFmp4Segmenter(
        (init) => {
          stream.initSegment = init;
          stream.codec = parseAvcCodec(init);
          stream.lastSegmentAt = Date.now();
          console.log(
            `[camera-streams] ${cameraId}: fMP4 init segment ${init.length}B, codec ${stream.codec}`
          );
          for (const waiter of stream.onInit) waiter();
          stream.onInit.clear();
        },
        (segment) => {
          stream.hasData = true;
          stream.lastSegmentAt = Date.now();
          stream.bytesOut += segment.length;
          for (const client of stream.clients) writeSegment(client, segment);
        }
      )
    );
  } else {
    let lastDesyncLogAt = 0;
    gst.stdout.on(
      'data',
      createMultipartParser(
        (part) => {
          stream.hasData = true;
          for (const client of stream.clients) {
            writeFrame(client, part);
            if (client.blocked && Date.now() - client.blockedSince > CAMERA_CLIENT_BLOCKED_WARN_MS) {
              console.warn(
                `[camera-streams] ${cameraId}: client stalled for ${Date.now() - client.blockedSince}ms, dropping frames`
              );
              client.blockedSince = Date.now();
            }
          }
        },
        () => {
          const now = Date.now();
          if (now - lastDesyncLogAt < 1000) return;
          lastDesyncLogAt = now;
          console.warn(`[camera-streams] ${cameraId}: multipart desync, resyncing`);
        }
      )
    );
  }

  gst.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.error(`[camera-streams] ${cameraId}: ${text}`);
  });

  gst.on('error', (err) => {
    console.error(`[camera-streams] ${cameraId}: failed to start gst-launch-1.0: ${err.message}`);
    dropStreamClients(stream, 500);
    cameraStreams.delete(cameraId);
  });

  gst.on('close', (code, signal) => {
    if (cameraStreams.get(cameraId) === stream) {
      cameraStreams.delete(cameraId);
    }
    if (stream.stallTimer) {
      clearInterval(stream.stallTimer);
      stream.stallTimer = null;
    }
    if (stream.clients.size > 0) {
      console.log(`[camera-streams] ${cameraId}: gst stopped code=${code} signal=${signal}`);
    }
    dropStreamClients(stream, 502);
  });

  console.log(
    `[camera-streams] ${cameraId}: receiving RTP/H264 on UDP ${port} (${transport}${fmp4 ? ', no proxy' : ''})`
  );
  return stream;
}

/**
 * Detaches every client from a pipeline that has gone away, and wakes anyone still waiting for an
 * init segment so no request is left parked on a dead stream.
 *
 * fmp4 clients are aborted rather than ended cleanly: a clean FIN on a chunked response is
 * indistinguishable from a normal end-of-stream to fetch(), so the player would sit there believing
 * all was well. An abort surfaces as an error it reconnects on.
 */
function dropStreamClients(stream, statusIfUnstarted) {
  for (const waiter of stream.onInit) waiter();
  stream.onInit.clear();
  for (const client of stream.clients) {
    if (client.firstFrameTimer) clearTimeout(client.firstFrameTimer);
    if (client.initTimer) clearTimeout(client.initTimer);
    if (!client.res.headersSent) {
      client.res.status(statusIfUnstarted).end();
    } else if (client.kind === 'fmp4' && client.res.socket) {
      client.res.socket.destroy();
    } else {
      client.res.end();
    }
  }
  stream.clients.clear();
}

// -----------------------------------------------------------------------
// SMALL EXPRESS WEB SERVER
// Handles requests from the CS to make SSH commands directly to the devices
// on the rover. It is not meant for constant SSH connections.
// -----------------------------------------------------------------------


function generateUniqueID(name) {
  return `${name}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * What each SSH command actually did, keyed by connection id.
 *
 * This exists because the previous implementation could not report a failure even in principle:
 * it piped the command's stdout into the same `res` that /ssh had already answered with
 * `res.json({connectionID})`, so every byte was written after the response had ended and was
 * discarded; stderr was never read at all, and the exit code was never looked at. A script that
 * could not be found looked exactly like one that ran. Everything lands here instead, is logged
 * with an [ssh] prefix, and is readable over /ssh-result/:id.
 */
const sshResults = {};
/** Keep the tail, not the head: the error is at the end of a long build log. */
const SSH_RESULT_MAX_BYTES = 64 * 1024;
const SSH_RESULT_TTL_MS = 30 * 60 * 1000;
/**
 * How many lines of a command's output reach the CS terminal before it goes quiet.
 *
 * A start script that ends in a foreground `docker run` streams that container's logs for as long
 * as it runs, and mirroring all of it buries everything else the CS prints. These first lines are
 * what tell you whether the script got going; the rest is still captured in full (up to
 * SSH_RESULT_MAX_BYTES) and readable over /ssh-result/:id, so muting the terminal costs nothing.
 */
const SSH_CONSOLE_ECHO_LINES = 20;

function appendCapped(existing, chunk) {
  const next = existing + chunk;
  return next.length > SSH_RESULT_MAX_BYTES ? next.slice(next.length - SSH_RESULT_MAX_BYTES) : next;
}

function pruneSSHResults() {
  const cutoff = Date.now() - SSH_RESULT_TTL_MS;
  for (const [id, result] of Object.entries(sshResults)) {
    if (!result.running && result.finishedAt && result.finishedAt < cutoff) {
      delete sshResults[id];
    }
  }
}

function createSSHConnection(req) {
    const { host, username, password, commands, name, pty } = req.body;
    const conn = new Client();
    const id = generateUniqueID(name);
    const commandString = Array.isArray(commands) ? commands.join(' && ') : String(commands === undefined || commands === null ? '' : commands);
    const wantsPty = pty === true;

    pruneSSHResults();

    const result = {
      id,
      name,
      host,
      username,
      command: commandString,
      pty: wantsPty,
      running: true,
      exitCode: null,
      signal: null,
      error: null,
      stdout: '',
      stderr: '',
      startedAt: Date.now(),
      finishedAt: null,
    };
    sshResults[id] = result;

    const finish = (extra) => {
      if (!result.running) return;
      Object.assign(result, extra, { running: false, finishedAt: Date.now() });
    };

    console.log(`[ssh] ${id}: connecting ${username}@${host}${wantsPty ? ' (pty)' : ''}`);
    console.log(`[ssh] ${id}: $ ${commandString}`);

    conn.on('ready', () => {
      // conn.exec runs a non-login, non-interactive shell: nothing from .bashrc / .profile applies,
      // PATH is the bare default, and aliases do not exist. The working directory is $HOME, so
      // commands must be absolute or relative to it.
      //
      // Without `pty` there is also no terminal, and a script that runs `docker run -it` aborts
      // with "the input device is not a TTY" even though it works by hand. Callers opt in per
      // command. Note that a PTY merges stderr into stdout, so with pty:true everything shows up
      // under `out|` and `result.stderr` stays empty — that is the terminal's doing, not a bug.
      conn.exec(commandString, { pty: wantsPty }, (err, stream) => {
        if (err) {
          console.error(`[ssh] ${id}: exec failed: ${err.message}`);
          finish({ error: err.message });
          conn.end();
          return;
        }

        let echoedLines = 0;
        let echoTruncated = false;

        // Echo to the CS terminal only up to the budget, then say so once. Everything keeps going
        // into `result` either way, so muting the terminal costs no diagnostic information.
        // Counted per line rather than per chunk: one SSH data event can carry many lines, and it
        // is lines that flood the terminal.
        const echo = (log, marker, text) => {
          if (echoTruncated) return;

          const lines = text.replace(/\r/g, '').split('\n').filter((line) => line.length > 0);

          for (const line of lines) {
            if (echoedLines >= SSH_CONSOLE_ECHO_LINES) {
              echoTruncated = true;
              console.log(
                `[ssh] ${id}: further output suppressed — read it with ` +
                `curl -s localhost:5000/ssh-result/${encodeURIComponent(id)}`
              );
              return;
            }
            echoedLines++;
            log(`[ssh] ${id} ${marker}| ${line}`);
          }
        };

        stream.on('data', (data) => {
          const text = data.toString();
          result.stdout = appendCapped(result.stdout, text);
          echo(console.log, 'out', text);
        });

        // Where every "No such file or directory" and "Permission denied" goes. Reading this is
        // the whole point: it was previously never read.
        stream.stderr.on('data', (data) => {
          const text = data.toString();
          result.stderr = appendCapped(result.stderr, text);
          echo(console.error, 'err', text);
        });

        stream.on('close', (code, signal) => {
          const ms = Date.now() - result.startedAt;
          console.log(`[ssh] ${id}: exit code=${code} signal=${signal || '-'} after ${ms}ms`);
          finish({
            exitCode: code === undefined ? null : code,
            signal: signal === undefined ? null : signal,
          });
          conn.end();
        });
      });
    })
    .on('error', (err) => {
      console.error(`[ssh] ${id}: connection error: ${err.message}`);
      finish({ error: err.message });
    })
    .on('close', () => {
      // Covers the peer dropping the connection before the command reported a close.
      finish({
        error: result.error || 'connection closed before the command finished',
      });
    });

    conn.connect({ host, username, password });
    activeConnection++;
    connections[id] = conn;
    return id;

}

app.post('/ssh', (req, res) => {
  const id = createSSHConnection(req);

  res.json({ connectionID: id });
});

/**
 * Result of one SSH command. Poll until `running` is false, then read `exitCode` / `stderr`.
 * Usable straight from a shell:  curl -s localhost:5000/ssh-result/<id> | jq
 */
app.get('/ssh-result/:id', (req, res) => {
  const result = sshResults[req.params.id];

  if (!result) {
    res.status(404).json({ error: `No SSH result for ${req.params.id}` }).end();
    return;
  }

  res.json(result);
});

/** Every command this server has run, newest last, without the output bodies. */
app.get('/ssh-results', (_req, res) => {
  res.json(
    Object.values(sshResults)
      .sort((a, b) => a.startedAt - b.startedAt)
      .map(({ stdout, stderr, ...summary }) => ({
        ...summary,
        stdoutBytes: stdout.length,
        stderrBytes: stderr.length,
      }))
  );
});

app.get('/close-connection/:id', (req, res) => {
  const { id } = req.params;

  if (connections[id]) {
      connections[id].end();
      delete connections[id];
      activeConnection--;
      console.log(`[ssh] ${id}: connection closed by the CS`);
      res.json({status: true}).end()
  } else {
    console.log(`[ssh] ${id}: close requested but no such connection (already finished?)`)
      res.status(404).json({ status: false, error: `Connection ${id} not found` }).end()
  }
});

function parsePingMs(stdout, stderr) {
  const text = `${stdout || ''}\n${stderr || ''}`;
  const mUs = text.match(/time=([\d.,]+)\s*(?:µs|us)\b/i);
  if (mUs) {
    const u = parseFloat(String(mUs[1]).replace(',', '.'));
    if (Number.isFinite(u)) return u / 1000;
  }
  const m =
    text.match(/time=([\d.,]+)\s*ms/i) || text.match(/time<([\d.,]+)\s*ms/i);
  if (!m) return null;
  const n = parseFloat(String(m[1]).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** When `ping` is missing (common in slim images) or ICMP is blocked, approximate RTT via TCP handshake. */
function tcpConnectMs(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const sock = net.connect({ host, port }, () => {
      const ms = Date.now() - t0;
      sock.destroy();
      resolve(ms);
    });
    sock.setTimeout(timeoutMs);
    sock.on('error', () => {
      try {
        sock.destroy();
      } catch (_) {}
      resolve(null);
    });
    sock.on('timeout', () => {
      try {
        sock.destroy();
      } catch (_) {}
      resolve(null);
    });
  });
}

async function probeOneHost(host) {
  const pingBin = fs.existsSync('/bin/ping') ? '/bin/ping' : 'ping';
  const ports = [22, 9090, 80, 443];

  const icmpMs = await new Promise((resolve) => {
    execFile(
      pingBin,
      ['-c', '1', '-W', '2', host],
      { timeout: 4000 },
      (err, stdout, stderr) => {
        const ms = parsePingMs(stdout, stderr);
        if (ms != null) return resolve({ ms, method: 'icmp', err: null });
        resolve({ ms: null, err });
      }
    );
  });
  if (icmpMs.ms != null) {
    return { host, ok: true, ms: icmpMs.ms, method: icmpMs.method };
  }

  for (const port of ports) {
    const ms = await tcpConnectMs(host, port, 2000);
    if (ms != null) {
      return { host, ok: true, ms, method: `tcp:${port}` };
    }
  }

  const detail =
    icmpMs.err && icmpMs.err.code === 'ENOENT'
      ? 'ping missing / no TCP'
      : icmpMs.err
        ? String(icmpMs.err.message || icmpMs.err)
        : 'no reply';
  return { host, ok: false, ms: null, detail };
}

async function measureAllLinkPings() {
  const hosts = [];
  for (const h of LINK_PING_HOSTS) {
    hosts.push(await probeOneHost(h));
  }
  const ok = hosts.some((x) => x.ok);
  return { ok, hosts };
}

const LOOPBACK_IPS = new Set(['127.0.0.1', '::1']);

/** Express sees IPv4 peers in IPv6-mapped form (`::ffff:127.0.0.1`) on a dual-stack socket. */
function normalizeIp(ip) {
  if (!ip) return '';
  return ip.startsWith('::ffff:') ? ip.slice(7) : ip;
}

function ownInterfaceIps() {
  const out = new Set();
  for (const list of Object.values(os.networkInterfaces())) {
    for (const iface of list || []) out.add(normalizeIp(iface.address));
  }
  return out;
}

/**
 * GET /operator-role — is the requesting browser running on this same machine (the NUC)?
 *
 * Only that browser shows the HD confirmation dialogs and advertises the confirmation services;
 * every other viewer of the page stays silent. See frontend/src/hooks/operatorRoleHooks.ts.
 *
 * Deliberately reads `req.socket.remoteAddress` and not `req.ip`: `trust proxy` is off today, but
 * turning it on would make `req.ip` spoofable from an `X-Forwarded-For` header, and this decides
 * who is allowed to answer the rover.
 */
app.get('/operator-role', (req, res) => {
  const ip = normalizeIp(req.socket.remoteAddress);
  res.json({ operator: LOOPBACK_IPS.has(ip) || ownInterfaceIps().has(ip), clientIp: ip });
});

/**
 * GET /link-ping — Per-host ICMP (else TCP RTT) for LINK_PING_HOSTS.
 * Response includes `hosts` array in display order (CS header shows each row).
 */
app.get('/link-ping', async (req, res) => {
  try {
    const out = await measureAllLinkPings();
    const firstOk = out.hosts.find((h) => h.ok);
    return res.json({
      ok: out.ok,
      hosts: out.hosts,
      host: firstOk ? firstOk.host : LINK_PING_HOSTS[0],
      ms: firstOk ? firstOk.ms : null,
      method: firstOk ? firstOk.method : undefined,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      hosts: LINK_PING_HOSTS.map((host) => ({
        host,
        ok: false,
        ms: null,
        detail: String(e && e.message ? e.message : e),
      })),
      host: LINK_PING_HOSTS[0],
      ms: null,
      detail: String(e && e.message ? e.message : e),
    });
  }
});

/**
 * GET /wifi-signal — Signal strength (dBm) of the antenna mast (WIFI_ANTENNA_MAC)
 * as seen by the RouterOS AP's WiFi registration table.
 */
/**
 * Channel and width live on a different endpoint than the registration table, and they change
 * essentially never — so they are cached rather than re-fetched on every 1 Hz poll. Without this
 * the header's polling would triple the request rate against the router (and triple the login
 * noise it writes to its own log).
 */
const WIFI_RADIO_CACHE_MS = 15000;
let wifiRadioCache = { at: 0, byInterface: {} };

async function getWifiRadioInfo(interfaceName) {
  const now = Date.now();
  if (now - wifiRadioCache.at < WIFI_RADIO_CACHE_MS) {
    return wifiRadioCache.byInterface[interfaceName] || null;
  }

  try {
    const response = await axios.get(`http://${WIFI_ROUTER_HOST}/rest/interface/wifi`, {
      auth: WIFI_ROUTER_AUTH,
      timeout: 3000,
    });
    const interfaces = Array.isArray(response.data) ? response.data : [];
    const byInterface = {};

    await Promise.all(
      interfaces.map(async (iface) => {
        const entry = {
          ssid: iface['configuration.ssid'] || null,
          mode: iface['configuration.mode'] || null,
          width: iface['channel.width'] || null,
          // Configured value; may be a range like "5745-5765".
          frequency: iface['channel.frequency'] || null,
          channel: null,
          txPower: null,
        };
        try {
          // `monitor` reports the channel actually in use. For a station-bridge that is dictated
          // by the AP, so it can differ from the configured range above.
          const monitor = await axios.post(
            `http://${WIFI_ROUTER_HOST}/rest/interface/wifi/monitor`,
            { '.id': iface['.id'], once: '' },
            { auth: WIFI_ROUTER_AUTH, timeout: 3000 }
          );
          const status = Array.isArray(monitor.data) ? monitor.data[0] : null;
          if (status) {
            entry.channel = status.channel || null;
            entry.txPower = status['tx-power'] || null;
          }
        } catch (_) {
          // Fall back to the configured frequency.
        }
        if (iface.name) byInterface[iface.name] = entry;
      })
    );

    wifiRadioCache = { at: now, byInterface };
  } catch (_) {
    // Keep serving the last good values, and throttle retries so a down router does not turn
    // every poll into a fresh timeout.
    wifiRadioCache = { at: now, byInterface: wifiRadioCache.byInterface };
  }

  return wifiRadioCache.byInterface[interfaceName] || null;
}

app.get('/wifi-signal', async (req, res) => {
  try {
    const response = await axios.get(
      `http://${WIFI_ROUTER_HOST}/rest/interface/wifi/registration-table`,
      { auth: WIFI_ROUTER_AUTH, timeout: 3000 }
    );
    const devices = Array.isArray(response.data) ? response.data : [];
    const device = devices.find((d) => d['mac-address'] === WIFI_ANTENNA_MAC);
    if (!device) {
      return res.json({ ok: false, detail: 'Antenna mast not registered on AP' });
    }
    const radio = device.interface ? await getWifiRadioInfo(device.interface) : null;
    return res.json({ ok: true, signal: device.signal, raw: device, radio });
  } catch (e) {
    return res.json({ ok: false, detail: e instanceof Error ? e.message : String(e) });
  }
});

app.get('/camera-streams/stats', (_req, res) => {
  res.json(buildCameraStatsSnapshot());
});

/**
 * Fragmented MP4 for MSE. The browser gets the rover's H.264 exactly as sent — nothing decodes or
 * re-encodes it anywhere in this process.
 *
 * Every client must receive the init segment (ftyp+moov) before any fragment, including one that
 * joins an hour in, so it is cached off the first moof and replayed here.
 */
app.get('/camera-streams/:cameraId.mp4', (req, res) => {
  const { cameraId } = req.params;
  if (getCameraTransport(cameraId) !== 'fmp4') {
    return res.status(404).json({ error: `Camera ${cameraId} does not serve fMP4` });
  }

  const stream = getCameraStream(cameraId);
  if (!stream) {
    return res.status(404).json({ error: `Unknown camera stream: ${cameraId}` });
  }

  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true, 15000);
  res.setTimeout(0);

  const client = {
    res,
    cameraId,
    kind: 'fmp4',
    closed: false,
    sent: 0,
    dropped: 0,
    blocked: false,
    blockedSince: 0,
    firstFrameTimer: null,
    initTimer: null,
  };

  function cleanupClient() {
    if (client.closed) return;
    client.closed = true;
    if (client.initTimer) {
      clearTimeout(client.initTimer);
      client.initTimer = null;
    }
    stream.onInit.delete(onInitReady);
    stream.clients.delete(client);
    if (stream.clients.size === 0) scheduleStopCameraStream(cameraId);
  }

  req.on('close', cleanupClient);
  req.on('aborted', cleanupClient);
  res.on('close', cleanupClient);
  res.on('error', cleanupClient);

  function start() {
    if (client.closed) return;
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
      Connection: 'close',
      // The player cannot call addSourceBuffer until it knows the profile/level.
      'X-Video-Codec': stream.codec || '',
    });
    res.write(stream.initSegment);
    // Added only now: joining between two fragments is fine, but a client added before the init
    // segment existed would have been sent mid-stream fragments with no moov to interpret them.
    stream.clients.add(client);
  }

  function onInitReady() {
    if (client.initTimer) {
      clearTimeout(client.initTimer);
      client.initTimer = null;
    }
    if (stream.initSegment) start();
    else if (!client.closed) res.status(503).end();
  }

  if (stream.initSegment) {
    start();
    return;
  }

  // Bounded, always. Parking a client on a stream that never produces anything is precisely what
  // stops the linger timer from ever reclaiming it.
  stream.onInit.add(onInitReady);
  client.initTimer = setTimeout(() => {
    client.initTimer = null;
    stream.onInit.delete(onInitReady);
    if (!client.closed) {
      cleanupClient();
      res.status(503).end();
    }
  }, FMP4_INIT_TIMEOUT_MS);
});

app.get('/camera-streams/:cameraId.mjpg', (req, res) => {
  const { cameraId } = req.params;
  if (!Object.prototype.hasOwnProperty.call(CAMERA_GST_PORTS, cameraId)) {
    return res.status(404).json({ error: `Unknown camera stream: ${cameraId}` });
  }
  if (getCameraTransport(cameraId) === 'fmp4') {
    // One pipeline owns the UDP port, so a camera cannot serve both transports at once.
    return res
      .status(409)
      .json({ error: `Camera ${cameraId} streams fMP4; use /camera-streams/${cameraId}.mp4` });
  }

  if (req.method === 'HEAD') {
    return res.writeHead(200, {
      'Content-Type': `multipart/x-mixed-replace; boundary=${CAMERA_BOUNDARY}`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }).end();
  }

  const stream = getCameraStream(cameraId);
  if (!stream) {
    return res.status(404).json({ error: `Unknown camera stream: ${cameraId}` });
  }

  // Node 12's http.Server leaves Nagle on, which strands the tail of every frame behind an ACK.
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true, 15000);
  res.setTimeout(0); // a camera that goes quiet must not trip the 120s default server timeout

  const client = {
    res,
    firstFrameTimer: null,
    blocked: false,
    blockedSince: 0,
    pending: null,
    closed: false,
    sent: 0,
    dropped: 0,
    onDrain: null,
  };
  stream.clients.add(client);

  client.onDrain = () => {
    client.blocked = false;
    const next = client.pending;
    client.pending = null;
    if (next) flushFrame(client, next); // may immediately re-block, which is correct
  };
  res.on('drain', client.onDrain);

  client.firstFrameTimer = setTimeout(() => {
    // No frame within the timeout: 204 so CameraView shows its placeholder instead of a broken img.
    cleanupClient();
    if (!res.headersSent) {
      res.status(204).end();
    } else {
      res.end();
    }
  }, FIRST_FRAME_TIMEOUT_MS);

  function cleanupClient() {
    if (client.closed) return;
    client.closed = true;
    client.pending = null;
    if (client.firstFrameTimer) {
      clearTimeout(client.firstFrameTimer);
      client.firstFrameTimer = null;
    }
    res.removeListener('drain', client.onDrain);
    stream.clients.delete(client);
    if (stream.clients.size === 0) {
      scheduleStopCameraStream(cameraId);
    }
  }

  // Node 12's close semantics differ from >=14, so listen on every terminating event.
  req.on('close', cleanupClient);
  req.on('aborted', cleanupClient);
  res.on('close', cleanupClient);
  res.on('error', cleanupClient);
});

app.post('/save-screenshot', (req, res) => {
  const { cameraName, filename, imageData } = req.body;
  if (!cameraName || !filename || !imageData) {
    return res.status(400).json({ error: 'Missing cameraName, filename, or imageData' });
  }
  const safeName = cameraName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeFile = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const dir = path.join(SCREENSHOTS_DIR, safeName);
  fs.mkdir(dir, { recursive: true }, (mkdirErr) => {
    if (mkdirErr) {
      console.error('[save-screenshot] mkdir failed:', mkdirErr);
      return res.status(500).json({ error: mkdirErr.message });
    }
    const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFile(path.join(dir, safeFile), buffer, (writeErr) => {
      if (writeErr) {
        console.error('[save-screenshot] write failed:', writeErr);
        return res.status(500).json({ error: writeErr.message });
      }
      res.status(200).json({ path: `screenshots/${safeName}/${safeFile}` });
    });
  });
});

function stopAllCameraStreams() {
  for (const cameraId of [...cameraStreams.keys()]) {
    stopCameraStream(cameraId);
  }
}

// Handle Ctrl+C (SIGINT) or `kill` (SIGTERM)
process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  stopAllCameraStreams();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Process terminated.');
  stopAllCameraStreams();
  process.exit();
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Each camera gets its own origin. Browsers cap concurrent connections per origin at 6, and the
// cameras page wants 8 permanent MJPEG streams plus the stats, link-ping and wifi-signal polls —
// on one origin the surplus streams queue forever behind streams that never end.
for (const [cameraId, gstPort] of Object.entries(CAMERA_GST_PORTS)) {
  const streamPort = getCameraHttpPort(gstPort);
  http
    .createServer(app)
    .listen(streamPort, () =>
      console.log(`[camera-streams] ${cameraId}: HTTP stream listener on port ${streamPort}`)
    )
    .on('error', (err) =>
      console.error(`[camera-streams] ${cameraId}: cannot listen on ${streamPort}: ${err.message}`)
    );
}
