const express = require('express');
const cors = require('cors');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://produccion-jimmyfrontend.kc7r3m.easypanel.host';

const app = express();

// Middlewares
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true
}));
app.use(express.json());

// Routes
const apiRoutes = require('./routes/api');
const barberosController = require('./controllers/barberosController');
const serviciosController = require('./controllers/serviciosController');
app.use('/api', apiRoutes);

// OAuth routes (outside /api for Google redirects)
const authController = require('./controllers/authController');
app.get('/auth/google', authController.googleAuth);
app.get('/auth/google/callback', authController.googleAuthCallback);

// Allow routes without /api prefix for frontend compatibility
app.get('/barberos', barberosController.getBarberos);
app.get('/servicios', serviciosController.getServicios);
app.post('/auth/complete-profile', authController.completeProfile);

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
