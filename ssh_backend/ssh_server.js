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
const app = express();
app.use(express.json());

/** Shown top → bottom in the CS header (ping every host each poll). */
const LINK_PING_HOSTS = ['169.254.55.230', '169.254.55.231'];

// Cors
const cors = require('cors');
app.use(cors());

const CAMERA_GST_PORTS = {
  nav_back: 5000,
  nav_left: 5002,
  nav_right: 5004,
  nav_front: 5006,
  hd_gripper: 5008,
  up: 5010,
  cs_st_0: 5012,
  cs_st_1: 5014,
  cs_dr: 5016,
  cs_bh: 5018,
  cs_other_1: 5020,
  cs_other_2: 5022,
};

const cameraStreams = new Map();
const cameraStats = new Map();
const FIRST_FRAME_TIMEOUT_MS = 2500;
const CAMERA_STATS_WINDOW_MS = 1000;
const CAMERA_ACTIVE_TIMEOUT_MS = 2000;
const INTERNAL_GST_PORT_OFFSET = 10000;
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

function getCameraStats(cameraId) {
  let stats = cameraStats.get(cameraId);
  if (!stats) {
    stats = {
      samples: [],
      lastPacketAt: 0,
    };
    cameraStats.set(cameraId, stats);
  }
  return stats;
}

function pruneCameraStats(stats, now) {
  while (stats.samples.length > 0 && now - stats.samples[0].t > CAMERA_STATS_WINDOW_MS) {
    stats.samples.shift();
  }
}

function recordCameraPacket(cameraId, udpPayloadBytes) {
  const now = Date.now();
  const stats = getCameraStats(cameraId);
  stats.samples.push({
    t: now,
    payloadBytes: udpPayloadBytes,
    wireBytes: estimateWireBytes(udpPayloadBytes),
  });
  stats.lastPacketAt = now;
  pruneCameraStats(stats, now);
}

function buildCameraStatsSnapshot() {
  const now = Date.now();
  const out = {};
  for (const [cameraId, port] of Object.entries(CAMERA_GST_PORTS)) {
    const stats = getCameraStats(cameraId);
    pruneCameraStats(stats, now);
    const packetCount = stats.samples.length;
    const payloadBytes = stats.samples.reduce((sum, sample) => sum + sample.payloadBytes, 0);
    const wireBytes = stats.samples.reduce((sum, sample) => sum + sample.wireBytes, 0);
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
    };
  }
  return out;
}

function startCameraUdpProxy(cameraId, publicPort) {
  const internalPort = getInternalGstPort(publicPort);
  const socket = dgram.createSocket('udp4');
  const proxy = {
    socket,
    publicPort,
    internalPort,
    ready: false,
  };

  socket.on('message', (msg) => {
    recordCameraPacket(cameraId, msg.length);
    socket.send(msg, internalPort, '127.0.0.1', (err) => {
      if (err) console.error(`[camera-streams] ${cameraId}: UDP proxy send failed: ${err.message}`);
    });
  });

  socket.on('listening', () => {
    proxy.ready = true;
    console.log(`[camera-streams] ${cameraId}: proxying UDP ${publicPort} -> 127.0.0.1:${internalPort}`);
  });

  socket.on('error', (err) => {
    console.error(`[camera-streams] ${cameraId}: UDP proxy error on ${publicPort}: ${err.message}`);
    try {
      socket.close();
    } catch (_) {}
  });

  socket.bind(publicPort);
  return proxy;
}

function buildGstReceiveArgs(port) {
  return [
    '-q',
    'udpsrc',
    `port=${port}`,
    'caps=application/x-rtp,media=video,clock-rate=90000,encoding-name=H264,payload=96',
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
    'videoconvert',
    '!',
    'jpegenc',
    '!',
    'multipartmux',
    'boundary=ThisRandomString',
    '!',
    'fdsink',
    'fd=1',
  ];
}

function stopCameraStream(cameraId) {
  const stream = cameraStreams.get(cameraId);
  if (!stream) return;
  cameraStreams.delete(cameraId);
  if (stream.proxy && stream.proxy.socket) {
    try {
      stream.proxy.socket.close();
    } catch (_) {}
  }
  try {
    stream.process.kill('SIGTERM');
  } catch (_) {}
}

function getCameraStream(cameraId) {
  const existing = cameraStreams.get(cameraId);
  if (existing) return existing;

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
  };
  cameraStreams.set(cameraId, stream);

  gst.stdout.on('data', (chunk) => {
    stream.hasData = true;
    for (const client of stream.clients) {
      if (client.firstFrameTimer) {
        clearTimeout(client.firstFrameTimer);
        client.firstFrameTimer = null;
      }
      if (!client.res.headersSent) {
        client.res.writeHead(200, {
          'Content-Type': 'multipart/x-mixed-replace; boundary=ThisRandomString',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          Connection: 'close',
        });
      }
      client.res.write(chunk);
    }
  });

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
      'Content-Type': 'multipart/x-mixed-replace; boundary=ThisRandomString',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    }).end();
  }

  const stream = getCameraStream(cameraId);
  if (!stream) {
    return res.status(404).json({ error: `Unknown camera stream: ${cameraId}` });
  }

  const client = {
    res,
    firstFrameTimer: null,
  };
  stream.clients.add(client);

  client.firstFrameTimer = setTimeout(() => {
    stream.clients.delete(client);
    if (!res.headersSent) {
      res.status(204).end();
    } else {
      res.end();
    }
    if (stream.clients.size === 0) {
      stopCameraStream(cameraId);
    }
  }, FIRST_FRAME_TIMEOUT_MS);

  req.on('close', () => {
    if (client.firstFrameTimer) {
      clearTimeout(client.firstFrameTimer);
      client.firstFrameTimer = null;
    }
    stream.clients.delete(client);
    if (stream.clients.size === 0) {
      stopCameraStream(cameraId);
    }
  });
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
