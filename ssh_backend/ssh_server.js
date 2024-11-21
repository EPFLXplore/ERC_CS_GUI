const express = require('express');
const { Client } = require('ssh2');
const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

// -----------------------------------------------------------------------
// SMALL EXPRESS WEB SERVER
// Handles requests from the CS to make SSH commands directly to the devices
// on the rover. It is not meant for constant SSH connections.
// -----------------------------------------------------------------------

let activeConnection = 0
const connections = {};

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
        
        let output = '';
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

// // to debug
// setInterval(() => {
//   console.log(`Active SSH Connections: ${activeConnection}`);
// }, 1000);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));