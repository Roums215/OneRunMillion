const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Configuration de la connexion à la base de données MySQL
const dbConfig = {
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD
};

// Fonction pour obtenir une connexion à la base de données
async function getConnection() {
  try {
    return await mysql.createConnection(dbConfig);
  } catch (error) {
    console.error('Erreur de connexion MySQL:', error);
    throw new Error('Erreur de connexion à la base de données');
  }
}

// Fonction pour vérifier un token JWT
async function verifyToken(token) {
  try {
    if (!token) {
      return { valid: false, message: 'No authentication token provided' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    const connection = await getConnection();
    
    try {
      const [users] = await connection.query(
        'SELECT * FROM users WHERE id = ?', 
        [decoded.userId]
      );
      
      await connection.end();
      
      if (users.length === 0) {
        return { valid: false, message: 'User not found' };
      }
      
      // Récupérer les badges de l'utilisateur
      const conn2 = await getConnection();
      const [badges] = await conn2.query(
        'SELECT badge_name FROM user_badges WHERE user_id = ?',
        [decoded.userId]
      );
      await conn2.end();
      
      return { 
        valid: true, 
        user: {
          ...users[0],
          badges: badges.map(b => b.badge_name)
        }
      };
    } catch (error) {
      await connection.end();
      throw error;
    }
  } catch (error) {
    console.error('Token verification error:', error);
    return { valid: false, message: 'Invalid or expired token' };
  }
}

// Fonction d'authentification
exports.handler = async (event, context) => {
  // Configuration CORS pour permettre toutes les origines en développement
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
  
  // Gérer les requêtes preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  try {
    const path = event.path.replace(/^\\/api\\/auth\\//, '');
    
    // Endpoint: /api/auth/login
    if (path === 'login' && event.httpMethod === 'POST') {
      const { email, password } = JSON.parse(event.body);
      
      if (!email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Email and password are required' })
        };
      }
      
      const connection = await getConnection();
      
      try {
        const [users] = await connection.query(
          'SELECT * FROM users WHERE email = ?',
          [email]
        );
        
        if (users.length === 0) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid credentials' })
          };
        }
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ message: 'Invalid credentials' })
          };
        }
        
        // Générer le token JWT
        const token = jwt.sign(
          { userId: user.id },
          process.env.JWT_SECRET || 'fallback_secret_key',
          { expiresIn: process.env.JWT_EXPIRATION || '7d' }
        );
        
        // Récupérer les badges de l'utilisateur
        const [badges] = await connection.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [user.id]
        );
        
        // Récupérer les effets du profil utilisateur
        const [effects] = await connection.query(
          'SELECT effect_name FROM profile_effects WHERE user_id = ?',
          [user.id]
        );
        
        await connection.end();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            token,
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              displayName: user.display_name,
              avatar: user.avatar,
              totalSpent: parseFloat(user.total_spent) || 0,
              currentRank: user.current_rank,
              isAnonymous: user.is_anonymous === 1,
              createdAt: user.created_at,
              badges: badges.map(b => b.badge_name),
              profileCustomization: {
                theme: user.profile_theme || 'default',
                effects: effects.map(e => e.effect_name)
              }
            }
          })
        };
      } catch (error) {
        await connection.end();
        throw error;
      }
    }
    
    // Endpoint: /api/auth/register
    else if (path === 'register' && event.httpMethod === 'POST') {
      const { username, email, password } = JSON.parse(event.body);
      
      if (!username || !email || !password) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'All fields are required' })
        };
      }
      
      const connection = await getConnection();
      
      try {
        // Vérifier si l'utilisateur existe déjà
        const [existingUsers] = await connection.query(
          'SELECT * FROM users WHERE username = ? OR email = ?',
          [username, email]
        );
        
        if (existingUsers.length > 0) {
          return {
            statusCode: 409,
            headers,
            body: JSON.stringify({ message: 'Username or email already exists' })
          };
        }
        
        // Hacher le mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // Insérer le nouvel utilisateur
        const [result] = await connection.query(
          'INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)',
          [username, email, hashedPassword, username]
        );
        
        const userId = result.insertId;
        
        // Générer le token JWT
        const token = jwt.sign(
          { userId },
          process.env.JWT_SECRET || 'fallback_secret_key',
          { expiresIn: process.env.JWT_EXPIRATION || '7d' }
        );
        
        await connection.end();
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({
            message: 'User registered successfully',
            token,
            user: {
              id: userId,
              username,
              email,
              displayName: username,
              avatar: 'default-avatar.png',
              totalSpent: 0,
              currentRank: 0,
              isAnonymous: false,
              badges: [],
              profileCustomization: {
                theme: 'default',
                effects: []
              }
            }
          })
        };
      } catch (error) {
        await connection.end();
        throw error;
      }
    }
    
    // Endpoint: /api/auth/me (obtenir l'utilisateur actuel)
    else if (path === 'me' && event.httpMethod === 'GET') {
      const authHeader = event.headers.authorization || event.headers.Authorization;
      const token = authHeader ? authHeader.split(' ')[1] : null;
      
      const tokenVerification = await verifyToken(token);
      
      if (!tokenVerification.valid) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ message: tokenVerification.message })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          user: {
            id: tokenVerification.user.id,
            username: tokenVerification.user.username,
            email: tokenVerification.user.email,
            displayName: tokenVerification.user.display_name,
            avatar: tokenVerification.user.avatar,
            totalSpent: parseFloat(tokenVerification.user.total_spent) || 0,
            currentRank: tokenVerification.user.current_rank,
            isAnonymous: tokenVerification.user.is_anonymous === 1,
            badges: tokenVerification.user.badges,
            profileCustomization: {
              theme: tokenVerification.user.profile_theme || 'default',
              effects: []
            }
          }
        })
      };
    }
    
    // Endpoint non trouvé
    else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Endpoint not found' })
      };
    }
  } catch (error) {
    console.error('Auth function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message: 'Server error', error: error.message })
    };
  }
};
