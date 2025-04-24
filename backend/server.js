require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
// Modules de base de données
let dbModule;
let demoMode = process.env.DEMO_MODE === 'true';

// Déterminer quel module de base de données utiliser (réel ou démo)
if (demoMode) {
  console.log('*** MODE DÉMO ACTIVÉ - Utilisation d\'une base de données simulée ***');
  dbModule = require('./config/demo-db');
} else {
  dbModule = {
    initDb: require('./config/initDb'),
    connectDB: require('./config/db')
  };
}

// Import routes
const authRoutes = require('./routes/auth.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const paymentRoutes = require('./routes/payment.routes');
const userRoutes = require('./routes/user.routes');

// Initialize express app
const app = express();
const server = http.createServer(app);

// Middleware CORS - Configuration temporairement très permissive
app.use(cors({
  origin: '*', // Autorise toutes les origines temporairement
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Log des origines autorisées
console.log('CORS configuré pour autoriser toutes les origines temporairement');

// Configuration de Socket.io avec CORS permissif pour débogage
console.log('Configuration Socket.io avec CORS permissif');

const io = socketIo(server, {
  cors: {
    origin: '*', // Autorise toutes les origines pour Socket.io
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
  },
  transports: ['websocket', 'polling'] // Permet polling en fallback
});

// Second middleware CORS (supprimé car redondant avec celui du dessus)
/* Configuration redundante supprimée pour éviter les erreurs */

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
    if (demoMode) {
      // Mode démo
      await dbModule.initDb();
      db = await dbModule.connectDB();
    } else {
      // Mode normal
      try {
        await dbModule.initDb();
        db = await dbModule.connectDB();
      } catch (dbError) {
        // Si la connexion échoue, bascule automatiquement en mode démo
        console.error('Erreur de connexion à la base de données:', dbError);
        console.log('Basculement automatique en MODE DÉMO...');
        
        // Charger le module de démo en cas d'échec
        dbModule = require('./config/demo-db');
        demoMode = true;
        
        // Réessayer avec le mode démo
        await dbModule.initDb();
        db = await dbModule.connectDB();
      }
    }
    
    // Rendre le pool disponible globalement
    global.db = db;
    
    console.log('Base de données ' + (demoMode ? 'DÉMO' : 'MySQL') + ' connectée et initialisée avec succès');
    return db;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    throw error; // Ne pas quitter le processus, mais propager l'erreur
  }
}

// Démarrer la base de données puis le serveur
startDatabase().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Mode: ${demoMode ? 'DÉMO (données simulées)' : 'PRODUCTION (base de données réelle)'}`);
    console.log(`OneRun API déployée avec succès - Design luxueux préservé!`);
  });
}).catch(err => {
  console.error('Impossible de démarrer le serveur:', err);
  // Essayer de démarrer le serveur même sans base de données
  // pour les routes statiques et les messages d'erreur
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT} en mode de secours!`);
  });
});

module.exports = { app, io };
