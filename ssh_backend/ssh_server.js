const express = require('express');
const { Client } = require('ssh2');

const app = express();
app.use(express.json());

const cors = require('cors');
app.use(cors());

app.post('/ssh', (req, res) => {
    const { host, username, password, commands } = req.body;
    const conn = new Client();
    conn.on('ready', () => {
      const commandString = commands.join(' && ');  // Join commands with "&&"
      conn.exec(commandString, (err, stream) => {
        if (err) {
            console.error('Execution error:', err);
            return res.status(500).json({ error: 'SSH command failed' });
        }
  
        let output = '';
        stream.on('data', (data) => {
          output += data.toString();
        });
  
        stream.on('close', () => {
          conn.end();
          res.json({ output });
        });
      });
    })
    .on('error', (err) => res.status(500).json({ error: err.message }))
    .connect({ host, username, password });
  });

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));