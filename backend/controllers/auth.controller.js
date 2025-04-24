const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
// Connexion à la base de données
const connectDB = require('../config/db');
// Utiliser le modèle MySQL au lieu de MongoDB
const User = require('../models/user.model.mysql');

// Obtenir le pool de connexion
let pool;
async function getPool() {
  if (!pool) {
    pool = await connectDB();
  }
  return pool;
}

// JWT token verification middleware
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      console.log('Aucun token fourni dans la requête');
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    console.log('Vérification du token JWT...');
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
      console.log('Token décodé avec succès pour userId:', decoded.userId);
    } catch (jwtError) {
      console.error('Erreur lors du décodage du JWT:', jwtError.message);
      return res.status(401).json({ message: 'Invalid token format or signature' });
    }
    
    // Récupérer l'utilisateur avec ses badges via la méthode dédiée
    console.log(`Recherche de l'utilisateur ${decoded.userId} dans la base de données...`);
    const user = await User.findByIdWithBadges(decoded.userId);
    
    if (!user) {
      console.warn(`Utilisateur avec ID ${decoded.userId} introuvable dans la base de données`);
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Stocker l'utilisateur dans la requête pour les middleware suivants
    req.user = user;
    console.log(`Utilisateur ${user.username} (ID: ${user.id}) authentifié avec succès`);
    next();
  } catch (error) {
    console.error('Erreur complète lors de la vérification du token:', error);
    return res.status(401).json({ message: 'Authentication failed', details: error.message });
  }
};

// Register a new user
exports.register = async (req, res) => {
  try {
    console.log('==== DÉBUT D\'ENREGISTREMENT UTILISATEUR (VERSION SIMPLIFIÉE) ====');
    console.log('Requête d\'enregistrement reçue:', req.body);
    const { username, email, password, displayName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Les champs username, email et password sont obligatoires' });
    }
    
    // Méthode directe pour insérer l'utilisateur dans la base de données
    try {
      // Hasher le mot de passe
      console.log('Hachage du mot de passe...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      console.log('Obtention du pool de connexion...');
      pool = await getPool();
      console.log('Connexion directe à la base de données...');
      const connection = await pool.getConnection();
      
      // Vérifier si l'email existe déjà
      const [existingEmails] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmails.length > 0) {
        connection.release();
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      
      // Vérifier si le nom d'utilisateur existe déjà
      const [existingUsernames] = await connection.query('SELECT id FROM users WHERE username = ?', [username]);
      if (existingUsernames.length > 0) {
        connection.release();
        return res.status(400).json({ message: 'User with this username already exists' });
      }
      
      // Insérer l'utilisateur
      console.log('Insertion de l\'utilisateur...');
      const [result] = await connection.query(
        'INSERT INTO users (username, email, password, display_name, avatar, is_anonymous, total_spent, current_rank) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [username, email, hashedPassword, displayName || username, 'default-avatar.png', 0, 0, 0]
      );
      
      const userId = result.insertId;
      console.log('Utilisateur inséré avec l\'ID:', userId);
      
      // Récupérer les détails de l'utilisateur pour la réponse
      const [userDetails] = await connection.query('SELECT * FROM users WHERE id = ?', [userId]);
      connection.release();
      
      if (userDetails.length === 0) {
        throw new Error('Impossible de récupérer l\'utilisateur après création');
      }
      
      const user = userDetails[0];
      console.log('Détails utilisateur récupérés');
      
      // Générer le token JWT
      console.log('Génération du token JWT');
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: process.env.JWT_EXPIRATION || '7d' }
      );
      
      // Préparer la réponse
      const userResponse = {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name || user.username,
        avatar: user.avatar || 'default-avatar.png',
        totalSpent: parseFloat(user.total_spent) || 0,
        currentRank: user.current_rank || 0,
        badges: []
      };
      
      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: userResponse
      });
    } catch (dbError) {
      console.error('Erreur lors de l\'accès direct à la base de données:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('===== ERREUR D\'ENREGISTREMENT =====');
    console.error('Erreur détaillée lors de l\'enregistrement:', error);
    console.error('Type d\'erreur:', error.name);
    console.error('Message d\'erreur:', error.message);
    console.error('Stack trace:', error.stack);
    console.error('Requête utilisateur:', req.body);
    
    // Envoyer une réponse d'erreur détaillée pour débogage
    res.status(500).json({ 
      message: 'Error registering user', 
      error: error.message, 
      errorType: error.name,
      details: error.stack 
    });
    console.error('===== FIN ERREUR D\'ENREGISTREMENT =====');
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('Requête de connexion reçue:', req.body);
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }
    
    console.log(`Tentative de connexion pour l'email: ${email}`);
    
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Récupérer l'utilisateur par email
      const [users] = await connection.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (users.length === 0) {
        console.error(`Utilisateur non trouvé pour l'email: ${email}`);
        connection.release();
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = users[0];
      
      console.log(`Utilisateur trouvé: ${user.username} (ID: ${user.id})`);
      
      // Vérifier le mot de passe
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        console.error(`Mot de passe invalide pour l'utilisateur: ${user.username}`);
        connection.release();
        return res.status(401).json({ message: 'Invalid password' });
      }
      
      console.log(`Authentification réussie pour: ${user.username}`);
      
      // Récupérer les badges de l'utilisateur
      const [badges] = await connection.query(
        'SELECT badge_name FROM user_badges WHERE user_id = ?',
        [user.id]
      );
      
      // Récupérer les effets du profil
      const [effects] = await connection.query(
        'SELECT effect_name FROM profile_effects WHERE user_id = ?',
        [user.id]
      );
      
      // Construire l'objet utilisateur complet
      const userWithDetails = {
        ...user,
        badges: badges.map(b => b.badge_name),
        profileCustomization: {
          theme: user.profile_theme || 'default',
          effects: effects.map(e => e.effect_name)
        }
      };
      
      // Générer le token JWT
      const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET || 'fallback_secret_key',
        { expiresIn: process.env.JWT_EXPIRATION || '7d' }
      );
      
      // Mettre à jour la dernière connexion
      await connection.query(
        'UPDATE users SET last_login = NOW() WHERE id = ?',
        [user.id]
      );
      
      // Libérer la connexion
      connection.release();
      
      // Envoyer la réponse
      res.status(200).json({
        message: 'Login successful',
        token,
        user: {
          id: userWithDetails.id,
          username: userWithDetails.username,
          email: userWithDetails.email,
          displayName: userWithDetails.display_name,
          avatar: userWithDetails.avatar,
          totalSpent: parseFloat(userWithDetails.total_spent) || 0,
          currentRank: userWithDetails.current_rank,
          badges: userWithDetails.badges,
          profileCustomization: userWithDetails.profileCustomization
        }
      });
    } catch (error) {
      // Libérer la connexion en cas d'erreur
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur de connexion:', error);
    res.status(500).json({ 
      message: 'Error logging in', 
      error: error.message,
      stack: error.stack
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = req.user;
    
    res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.display_name,
        avatar: user.avatar,
        totalSpent: user.total_spent,
        currentRank: user.current_rank,
        badges: user.badges,
        profileCustomization: user.profileCustomization,
        isAnonymous: user.is_anonymous,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// Logout user (client-side only in this implementation)
exports.logout = (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;
    
    // Verify current password
    const isPasswordValid = await User.comparePassword(user.password, currentPassword);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    await User.update(user.id, { password: newPassword });
    
    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
};
