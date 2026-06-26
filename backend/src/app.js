const express = require('express');
const cors = require('cors');

// Fix: node:sqlite returns INTEGER as BigInt, but JSON.stringify can't serialize BigInt.
// This global patch makes BigInts serialize as Numbers in JSON responses.
BigInt.prototype.toJSON = function() { return Number(this); };

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Configure port and listen on all interfaces (0.0.0.0) for local network access
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  // Get local IP addresses to display in the console
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  const results = {};

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  console.log(`Backend server is running on http://${HOST}:${PORT}`);
  console.log('You can access it on your local network at:');
  for (const name of Object.keys(results)) {
    results[name].forEach(ip => {
      console.log(`  http://${ip}:${PORT}`);
    });
  }
});
