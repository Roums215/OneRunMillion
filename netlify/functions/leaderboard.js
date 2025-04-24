const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
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
      
      return { 
        valid: true, 
        user: users[0]
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

// Récupérer les badges d'un utilisateur
async function fetchBadgesForUser(userId) {
  const connection = await getConnection();
  try {
    const [badges] = await connection.query(
      'SELECT badge_name FROM user_badges WHERE user_id = ?',
      [userId]
    );
    await connection.end();
    return badges.map(b => b.badge_name);
  } catch (error) {
    await connection.end();
    return [];
  }
}

// Formater un utilisateur pour la réponse
async function formatUser(user, rank) {
  const badges = await fetchBadgesForUser(user.id);
  return {
    id: user.id,
    rank,
    username: user.is_anonymous ? `Anonymous${user.id.toString().substring(0, 4)}` : user.username,
    displayName: user.is_anonymous ? `Anonymous User` : user.display_name,
    avatar: user.avatar || 'default-avatar.png',
    totalSpent: parseFloat(user.total_spent) || 0,
    badges,
    theme: user.profile_theme || 'default'
  };
}

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
    const path = event.path.replace(/^\\/api\\/leaderboard\\//, '');
    
    // Endpoint: /api/leaderboard/global
    if (path.startsWith('global')) {
      const connection = await getConnection();
      const queryParams = new URLSearchParams(event.queryStringParameters || {});
      const page = parseInt(queryParams.get('page') || 1);
      const limit = parseInt(queryParams.get('limit') || 20);
      const skip = (page - 1) * limit;
      
      try {
        // Récupérer les utilisateurs triés par total_spent
        const [users] = await connection.query(
          `SELECT * FROM users
           ORDER BY total_spent DESC
           LIMIT ?, ?`,
          [skip, limit]
        );
        
        // Compter le nombre total d'utilisateurs
        const [countResult] = await connection.query('SELECT COUNT(*) as count FROM users');
        const total = countResult[0].count;
        
        // Formater les utilisateurs pour la réponse
        const formattedUsers = [];
        for (let i = 0; i < users.length; i++) {
          const rank = skip + i + 1;
          const badgesConn = await getConnection();
          const [badges] = await badgesConn.query(
            'SELECT badge_name FROM user_badges WHERE user_id = ?',
            [users[i].id]
          );
          await badgesConn.end();
          
          formattedUsers.push({
            id: users[i].id,
            rank,
            username: users[i].is_anonymous ? `Anonymous${users[i].id.toString().substring(0, 4)}` : users[i].username,
            displayName: users[i].is_anonymous ? `Anonymous User` : users[i].display_name,
            avatar: users[i].avatar || 'default-avatar.png',
            totalSpent: parseFloat(users[i].total_spent) || 0,
            badges: badges.map(b => b.badge_name),
            theme: users[i].profile_theme || 'default'
          });
        }
        
        await connection.end();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            users: formattedUsers,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
          })
        };
      } catch (error) {
        await connection.end();
        throw error;
      }
    }
    
    // Endpoint: /api/leaderboard/position (nécessite authentification)
    else if (path === 'position') {
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
      
      const userId = tokenVerification.user.id;
      const totalSpent = parseFloat(tokenVerification.user.total_spent) || 0;
      
      const connection = await getConnection();
      
      try {
        // Calculer le rang global
        const [globalRankResult] = await connection.query(
          'SELECT COUNT(*) as rank FROM users WHERE total_spent > ?',
          [totalSpent]
        );
        
        const globalRank = globalRankResult[0].rank + 1;
        
        // Date de début de la semaine courante (lundi)
        const now = new Date();
        const dayOfWeek = now.getDay() || 7; // Dimanche (0) devient 7
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - dayOfWeek + 1);
        startOfWeek.setHours(0, 0, 0, 0);
        
        // Calculer le total hebdomadaire de l'utilisateur
        const [userWeeklyResult] = await connection.query(
          'SELECT SUM(amount) as total FROM payments WHERE user_id = ? AND created_at >= ? AND status = "completed"',
          [userId, startOfWeek.toISOString().slice(0, 19).replace('T', ' ')]
        );
        
        const userWeeklyTotal = parseFloat(userWeeklyResult[0].total) || 0;
        
        // Récupérer les utilisateurs ayant un total hebdomadaire supérieur
        const [weeklyRankResult] = await connection.query(
          `SELECT COUNT(*) as rank FROM (
            SELECT user_id, SUM(amount) as total_weekly
            FROM payments
            WHERE created_at >= ? AND status = "completed"
            GROUP BY user_id
            HAVING total_weekly > ?
          ) as weekly_totals`,
          [startOfWeek.toISOString().slice(0, 19).replace('T', ' '), userWeeklyTotal]
        );
        
        const weeklyRank = weeklyRankResult[0].rank + 1;
        
        // Date de début du mois courant
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        // Calculer le total mensuel de l'utilisateur
        const [userMonthlyResult] = await connection.query(
          'SELECT SUM(amount) as total FROM payments WHERE user_id = ? AND created_at >= ? AND status = "completed"',
          [userId, startOfMonth.toISOString().slice(0, 19).replace('T', ' ')]
        );
        
        const userMonthlyTotal = parseFloat(userMonthlyResult[0].total) || 0;
        
        // Récupérer les utilisateurs ayant un total mensuel supérieur
        const [monthlyRankResult] = await connection.query(
          `SELECT COUNT(*) as rank FROM (
            SELECT user_id, SUM(amount) as total_monthly
            FROM payments
            WHERE created_at >= ? AND status = "completed"
            GROUP BY user_id
            HAVING total_monthly > ?
          ) as monthly_totals`,
          [startOfMonth.toISOString().slice(0, 19).replace('T', ' '), userMonthlyTotal]
        );
        
        const monthlyRank = monthlyRankResult[0].rank + 1;
        
        await connection.end();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            global: {
              rank: globalRank,
              total: totalSpent
            },
            weekly: {
              rank: weeklyRank,
              total: userWeeklyTotal
            },
            monthly: {
              rank: monthlyRank,
              total: userMonthlyTotal
            }
          })
        };
      } catch (error) {
        await connection.end();
        throw error;
      }
    }
    
    // Endpoint: /api/leaderboard/nearby (nécessite authentification)
    else if (path === 'nearby') {
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
      
      const userId = tokenVerification.user.id;
      const totalSpent = parseFloat(tokenVerification.user.total_spent) || 0;
      
      const connection = await getConnection();
      
      try {
        // Récupérer le classement de l'utilisateur
        const [rankResult] = await connection.query(
          'SELECT COUNT(*) as rank FROM users WHERE total_spent > ?',
          [totalSpent]
        );
        
        const userRank = rankResult[0].rank + 1;
        
        // Récupérer les utilisateurs au-dessus (meilleurs classements)
        const [above] = await connection.query(
          `SELECT id, username, display_name, avatar, total_spent, is_anonymous, profile_theme 
           FROM users 
           WHERE total_spent > ? 
           ORDER BY total_spent ASC 
           LIMIT 3`,
          [totalSpent]
        );
        
        // Récupérer les utilisateurs en-dessous (moins bons classements)
        const [below] = await connection.query(
          `SELECT id, username, display_name, avatar, total_spent, is_anonymous, profile_theme 
           FROM users 
           WHERE total_spent < ? 
           ORDER BY total_spent DESC 
           LIMIT 3`,
          [totalSpent]
        );
        
        // Formater la réponse avec les concurrents au-dessus et en-dessous
        const aboveUsers = await Promise.all(above.map(async (user, i) => {
          return await formatUser(user, userRank - (above.length - i));
        }));
        
        const belowUsers = await Promise.all(below.map(async (user, i) => {
          return await formatUser(user, userRank + i + 1);
        }));
        
        // Récupérer les badges de l'utilisateur courant
        const badges = await fetchBadgesForUser(userId);
        
        // Formater l'utilisateur courant
        const currentUser = {
          id: tokenVerification.user.id,
          rank: userRank,
          username: tokenVerification.user.username,
          displayName: tokenVerification.user.display_name || tokenVerification.user.username,
          avatar: tokenVerification.user.avatar || 'default-avatar.png',
          totalSpent: totalSpent,
          badges: badges,
          theme: tokenVerification.user.profile_theme || 'default',
          isCurrentUser: true
        };
        
        await connection.end();
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            above: aboveUsers,
            current: currentUser,
            below: belowUsers
          })
        };
      } catch (error) {
        await connection.end();
        throw error;
      }
    }
    
    // Autres endpoints de leaderboard (top10, top100, etc.)
    else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ message: 'Endpoint not found' })
      };
    }
  } catch (error) {
    console.error('Leaderboard function error:', error);
    
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
