const express = require('express');
const { Client } = require('ssh2');

const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

// -----------------------------------------------------------------------
// SMALL EXPRESS WEB SERVER
// Handles requests from the CS to make SSH commands directly to the devices
// on the rover. It is not meant for constant SSH connections. Directly after the
// commands is executed, we close the connection to free resources.
// -----------------------------------------------------------------------

let activeConnection = 0
const connections = {};

function generateUniqueID() {
  return `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function createSSHConnection(req, res) {
    const { host, username, password, commands } = req.body;
    const conn = new Client();
    const id = generateUniqueID();
    conn.on('ready', () => {
      const commandString = commands.join(' && ');
      conn.exec(commandString, (err, stream) => {
        if (err) {
            console.log('Execution error:', err);
            return res.status(500).json({ error: 'SSH command failed' });
        }
  
        let output = '';
        stream.on('data', (data) => {
          output += data.toString();
        });
      });
    })
    .on('error', (err) => res.status(500).json({ error: err.message }))
    
    conn.connect({ host, username, password });
    activeConnection++;
    connections[id] = conn;
    return id;

}

app.post('/ssh', (req, res) => {
  const id = createSSHConnection(req, res);

  // check that the creation of docker container went well. If not (or already running)
  console.log(res)

  res.json({ connectionID: id });
});

app.get('/close-connection/:id', (req, res) => {
  const { id } = req.params;

  if (connections[id]) {
      connections[id].end();
      activeConnection--;
      res.json({});
  } else {
      res.status(404).json({ error: `Connection ${id} not found` });
  }
});

// to debug
// setInterval(() => {
//   console.log(`Active SSH Connections: ${activeConnection}`);
// }, 1000);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));