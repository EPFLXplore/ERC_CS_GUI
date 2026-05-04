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
const { execFile } = require('child_process');
const net = require('net');
const app = express();
app.use(express.json());

/** Shown top → bottom in the CS header (ping every host each poll). */
const LINK_PING_HOSTS = ['169.254.55.230', '169.254.55.231'];

// Cors
const cors = require('cors');
app.use(cors());

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

// Handle Ctrl+C (SIGINT) or `kill` (SIGTERM)
process.on('SIGINT', () => {
  console.log('Gracefully shutting down...');
  record.backupCSV(homeDir, mass_arm_file);
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Process terminated.');
  record.backupCSV(homeDir, mass_arm_file);
  process.exit();
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));