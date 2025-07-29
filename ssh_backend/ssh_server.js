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
const mass_arm_format_line = 'timestamp, mass\n';

record.checkCSVFileExists(homeDir, mass_arm_file, mass_arm_format_line);

// ExpressJS
const express = require('express');
const app = express();
app.use(express.json());

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