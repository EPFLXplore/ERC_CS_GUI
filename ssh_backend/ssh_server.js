// SSH2
const { Client } = require('ssh2');
let activeConnection = 0
const connections = {}

// Backup files
const os = require('os');
const fs = require('fs');
const homeDir = os.homedir();
const record = require('./record.js');

const mass_arm = 'mass_arm';
const mass_arm_file = `${mass_arm}_data`;
const mass_arm_format_line = 'timestamp, mass_hd, mass_dr, temperature, humidity, conductivity, ph, pm1_0_std, pm2_5_std, pm10_std, pm1_0_atm, pm2_5_atm, pm10_atm, num_particles_0_3, num_particles_0_5, num_particles_1_0, num_particles_2_5, num_particles_5_0, num_particles_10\n'

record.checkCSVFileExists(homeDir, mass_arm_file, mass_arm_format_line);

// ExpressJS
const express = require('express');
const { execFile, spawn } = require('child_process');
const dgram = require('dgram');
const net = require('net');
const http = require('http');
const axios = require('axios');
const app = express();
app.use(express.json());

/** Shown top → bottom in the CS header (ping every host each poll). */
const LINK_PING_HOSTS = ['169.254.55.230', '169.254.55.231'];

/** RouterOS REST API (antenna mast AP) for WiFi signal strength. */
const WIFI_ROUTER_HOST = '169.254.55.1';
const WIFI_ROUTER_AUTH = { username: 'admin', password: 'XploreAntenna3' };
const WIFI_ANTENNA_MAC = 'D4:01:C3:DC:B9:78';

// Cors
const cors = require('cors');
app.use(cors());

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
  microscope: 5014,
};

const cameraStreams = new Map();
const cameraStats = new Map();
const FIRST_FRAME_TIMEOUT_MS = 2500;
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

function buildCameraStatsSnapshot() {
  const now = Date.now();
  const oldestBucketId = Math.floor(now / CAMERA_STATS_BUCKET_MS) - CAMERA_STATS_WINDOW_BUCKETS;
  const out = {};
  for (const [cameraId, port] of Object.entries(CAMERA_GST_PORTS)) {
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

function stopCameraStream(cameraId) {
  const stream = cameraStreams.get(cameraId);
  if (!stream) return;
  cameraStreams.delete(cameraId);
  if (stream.stopTimer) {
    clearTimeout(stream.stopTimer);
    stream.stopTimer = null;
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
  const proxy = startCameraUdpProxy(cameraId, port);
  const internalPort = proxy.internalPort;

  const gst = spawn('gst-launch-1.0', buildGstReceiveArgs(internalPort), {
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stream = {
    process: gst,
    proxy,
    clients: new Set(),
    hasData: false,
    stopTimer: null,
  };
  cameraStreams.set(cameraId, stream);

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

  gst.stderr.on('data', (chunk) => {
    const text = chunk.toString().trim();
    if (text) console.error(`[camera-streams] ${cameraId}: ${text}`);
  });

  gst.on('error', (err) => {
    console.error(`[camera-streams] ${cameraId}: failed to start gst-launch-1.0: ${err.message}`);
    for (const client of stream.clients) {
      if (client.firstFrameTimer) clearTimeout(client.firstFrameTimer);
      if (!client.res.headersSent) client.res.status(500);
      client.res.end();
    }
    cameraStreams.delete(cameraId);
  });

  gst.on('close', (code, signal) => {
    if (cameraStreams.get(cameraId) === stream) {
      cameraStreams.delete(cameraId);
    }
    if (stream.clients.size > 0) {
      console.log(`[camera-streams] ${cameraId}: gst stopped code=${code} signal=${signal}`);
    }
    for (const client of stream.clients) {
      if (client.firstFrameTimer) clearTimeout(client.firstFrameTimer);
      if (!client.res.headersSent) client.res.status(502);
      client.res.end();
    }
    stream.clients.clear();
  });

  console.log(`[camera-streams] ${cameraId}: receiving RTP/H264 on UDP ${port}`);
  return stream;
}

// -----------------------------------------------------------------------
// SMALL EXPRESS WEB SERVER
// Handles requests from the CS to make SSH commands directly to the devices
// on the rover. It is not meant for constant SSH connections.
// -----------------------------------------------------------------------


function generateUniqueID(name) {
  return `${name}-${Math.floor(Math.random() * 1000)}`;
}

function createSSHConnection(req, res) {
    const { host, username, password, commands, name } = req.body;
    const conn = new Client();
    const id = generateUniqueID(name);

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    conn.on('ready', () => {
      const commandString = commands.join(' && ');
      conn.exec(commandString, (err, stream) => {
        if (err) {
            console.log('Execution error:', err);
            return res.status(500).json({ error: 'SSH command failed' }).end()
        }
        
        stream.on('data', (data) => {
          res.write(data.toString());
        });
        
      });
    })
    .on('error', (err) => {
      console.log(err.message)
      res.status(500).json({ error: err.message }).end()
    })
    
    conn.connect({ host, username, password });
    activeConnection++;
    connections[id] = conn;
    return id;

}

app.post('/ssh', (req, res) => {
  const id = createSSHConnection(req, res);

  res.json({ connectionID: id });
});

app.get('/close-connection/:id', (req, res) => {
  const { id } = req.params;

  if (connections[id]) {
      connections[id].end();
      activeConnection--;
      res.json({status: true}).end()
  } else {
    console.log("error 404 id not found")
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

app.get('/camera-streams/:cameraId.mjpg', (req, res) => {
  const { cameraId } = req.params;
  if (!Object.prototype.hasOwnProperty.call(CAMERA_GST_PORTS, cameraId)) {
    return res.status(404).json({ error: `Unknown camera stream: ${cameraId}` });
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

app.post('/sensor-record', (req, res) => {
  const {type_sensor, timestamp, values} = req.body;

  const line = [timestamp, ...values].join(',') + '\n';

  switch (type_sensor) {
    case mass_arm:
      if(fs.existsSync(`${mass_arm_file}.csv`)) {
        fs.appendFile(`${mass_arm_file}.csv`, line, (err) => {
          if (err) {
            console.error('Write error:', err);
            return res.sendStatus(500);
          }
          
        });
      }
      res.sendStatus(200);
      break;

    default:
      return res.status(400).json({ error: 'Invalid sensor type' }).end();
  }
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
  record.backupCSV(homeDir, mass_arm_file);
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Process terminated.');
  stopAllCameraStreams();
  record.backupCSV(homeDir, mass_arm_file);
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
