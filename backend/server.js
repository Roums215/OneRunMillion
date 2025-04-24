require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
// Modules de base de données
const initDb = require('./config/initDb');
const connectDB = require('./config/db');

// Import routes
const authRoutes = require('./routes/auth.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const paymentRoutes = require('./routes/payment.routes');
const userRoutes = require('./routes/user.routes');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Configuration de Socket.io avec CORS sécurisé pour l'environnement de production
const corsOrigin = process.env.CORS_ORIGIN || 'https://s1043322554.onlinehome.fr';
console.log('Configuration CORS avec origine:', corsOrigin);

const io = socketIo(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }
});

// Middleware de sécurité et de CORS pour production
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
  maxAge: 86400
}));

// Middleware spécifique pour les requêtes OPTIONS (préflight CORS)
app.options('*', cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de sécurité supplémentaire pour production
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  res.header('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  next();
});

// Route middleware
app.use('/api/auth', authRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);

// Route de statut pour vérifier le fonctionnement de l'API
app.get('/api/status', (req, res) => {
  res.status(200).json({ status: 'online', environment: process.env.NODE_ENV });
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to OneRun API' });
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join leaderboard room
  socket.on('join_leaderboard', () => {
    socket.join('leaderboard');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Initialisation de la base de données MySQL
let db;

// Fonction asynchrone pour démarrer la base de données
async function startDatabase() {
  try {
    // Initialiser la structure de la base de données si nécessaire
    await initDb();
    
    // Établir la connexion au pool MySQL
    db = await connectDB();
    
    // Rendre le pool disponible globalement
    global.db = db;
    
    console.log('Base de données MySQL connectée et initialisée avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

// Démarrer la base de données puis le serveur
startDatabase().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Impossible de démarrer le serveur:', err);
});

module.exports = { app, io };
