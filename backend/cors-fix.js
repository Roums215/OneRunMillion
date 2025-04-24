// Placez ce code au début de votre server.js
const cors = require('cors');

// Configuration CORS avec options complètes
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'https://s1043322554.onlinehome.fr',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
};

// Appliquez la configuration CORS
app.use(cors(corsOptions));

// Log pour déboguer
console.log('CORS configuré avec origine:', corsOptions.origin);
