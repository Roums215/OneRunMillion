// Utiliser les modèles MySQL au lieu de MongoDB
const User = require('../models/user.model.mysql');
const connectDB = require('../config/db');

// Pool de connexion MySQL
let pool;
async function getPool() {
  if (!pool) {
    pool = await connectDB();
  }
  return pool;
}

// Get global leaderboard (all-time)
exports.getGlobalLeaderboard = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Requête pour obtenir les utilisateurs triés par montant total dépensé
      const [users] = await connection.query(
        `SELECT 
          id, username, display_name, avatar, total_spent, is_anonymous, profile_theme
        FROM 
          users
        ORDER BY 
          total_spent DESC
        LIMIT ?, ?`,
        [skip, parseInt(limit)]
      );
      
      // Obtenir le nombre total d'utilisateurs pour la pagination
      const [totalResult] = await connection.query('SELECT COUNT(*) as total FROM users');
      const totalUsers = totalResult[0].total;
      
      // Récupérer les badges pour chaque utilisateur
      const userLeaderboard = [];
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        // Récupérer les badges de l'utilisateur
        const [badges] = await connection.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [user.id]
        );
        
        // Formater les données de l'utilisateur
        userLeaderboard.push({
          id: user.id,
          rank: skip + i + 1,
          username: user.is_anonymous ? `Anonymous${user.id.toString().substring(0, 4)}` : user.username,
          displayName: user.is_anonymous ? `Anonymous User` : user.display_name,
          avatar: user.avatar || 'default-avatar.png',
          totalSpent: parseFloat(user.total_spent) || 0,
          badges: badges.map(b => b.badge_name),
          theme: user.profile_theme || 'default'
        });
      }
      
      // Libérer la connexion
      connection.release();
      
      // Envoyer la réponse
      res.status(200).json({
        users: userLeaderboard,
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      // En cas d'erreur, libérer la connexion
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du classement global:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du classement global', 
      error: error.message 
    });
  }
};

// Get weekly leaderboard
exports.getWeeklyLeaderboard = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Date de début de la semaine courante (lundi)
      const now = new Date();
      const dayOfWeek = now.getDay() || 7; // Dimanche (0) devient 7
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek + 1); // Reculer jusqu'à lundi
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Requête pour obtenir le classement hebdomadaire
      const [weeklyRanking] = await connection.query(
        `SELECT 
          p.user_id, 
          SUM(p.amount) as total_spent
        FROM 
          payments p
        WHERE 
          p.created_at >= ? AND 
          p.status = "completed"
        GROUP BY 
          p.user_id
        ORDER BY 
          total_spent DESC
        LIMIT ?, ?`,
        [startOfWeek.toISOString().slice(0, 19).replace('T', ' '), skip, parseInt(limit)]
      );
      
      // Récupérer les détails des utilisateurs
      const userIds = weeklyRanking.map(item => item.user_id);
      
      if (userIds.length === 0) {
        connection.release();
        return res.status(200).json({
          users: [],
          total: 0,
          pages: 0,
          currentPage: parseInt(page)
        });
      }
      
      // Obtenir les informations des utilisateurs
      const [users] = await connection.query(
        `SELECT 
          id, username, display_name, avatar, is_anonymous, profile_theme 
        FROM 
          users 
        WHERE 
          id IN (?)`,
        [userIds]
      );
      
      // Récupérer les badges pour chaque utilisateur
      const fetchBadgesForUser = async (userId) => {
        const [badges] = await connection.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [userId]
        );
        return badges.map(b => b.badge_name);
      };
      
      // Créer un mapping des utilisateurs
      const userMap = {};
      for (const user of users) {
        const badges = await fetchBadgesForUser(user.id);
        userMap[user.id] = {
          ...user,
          badges
        };
      }
      
      // Formater le classement hebdomadaire
      const weeklyLeaderboard = [];
      for (let i = 0; i < weeklyRanking.length; i++) {
        const item = weeklyRanking[i];
        const user = userMap[item.user_id];
        
        if (user) {
          weeklyLeaderboard.push({
            id: user.id,
            rank: skip + i + 1,
            username: user.is_anonymous ? `Anonymous${user.id.toString().substring(0, 4)}` : user.username,
            displayName: user.is_anonymous ? `Anonymous User` : user.display_name,
            avatar: user.avatar || 'default-avatar.png',
            totalSpent: parseFloat(item.total_spent) || 0,
            badges: user.badges || [],
            theme: user.profile_theme || 'default'
          });
        }
      }
      
      // Compter le nombre total d'utilisateurs pour la pagination
      const [totalResult] = await connection.query(
        `SELECT 
          COUNT(DISTINCT user_id) as total
        FROM 
          payments
        WHERE 
          created_at >= ? AND 
          status = "completed"`,
        [startOfWeek.toISOString().slice(0, 19).replace('T', ' ')]
      );
      
      const total = totalResult[0].total || 0;
      
      // Libérer la connexion
      connection.release();
      
      // Renvoyer les résultats
      res.status(200).json({
        users: weeklyLeaderboard,
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      // Libérer la connexion en cas d'erreur
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du classement hebdomadaire:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du classement hebdomadaire', 
      error: error.message 
    });
  }
};

// Get monthly leaderboard
exports.getMonthlyLeaderboard = async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;
    
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Date de début du mois courant
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      // Requête pour obtenir le classement mensuel
      const [monthlyRanking] = await connection.query(
        `SELECT 
          p.user_id, 
          SUM(p.amount) as total_spent
        FROM 
          payments p
        WHERE 
          p.created_at >= ? AND 
          p.status = "completed"
        GROUP BY 
          p.user_id
        ORDER BY 
          total_spent DESC
        LIMIT ?, ?`,
        [startOfMonth.toISOString().slice(0, 19).replace('T', ' '), skip, parseInt(limit)]
      );
      
      // Récupérer les détails des utilisateurs
      const userIds = monthlyRanking.map(item => item.user_id);
      
      if (userIds.length === 0) {
        connection.release();
        return res.status(200).json({
          users: [],
          total: 0,
          pages: 0,
          currentPage: parseInt(page)
        });
      }
      
      // Obtenir les informations des utilisateurs
      const [users] = await connection.query(
        `SELECT 
          id, username, display_name, avatar, is_anonymous, profile_theme 
        FROM 
          users 
        WHERE 
          id IN (?)`,
        [userIds]
      );
      
      // Récupérer les badges pour chaque utilisateur
      const fetchBadgesForUser = async (userId) => {
        const [badges] = await connection.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [userId]
        );
        return badges.map(b => b.badge_name);
      };
      
      // Créer un mapping des utilisateurs
      const userMap = {};
      for (const user of users) {
        const badges = await fetchBadgesForUser(user.id);
        userMap[user.id] = {
          ...user,
          badges
        };
      }
      
      // Formater le classement mensuel
      const monthlyLeaderboard = [];
      for (let i = 0; i < monthlyRanking.length; i++) {
        const item = monthlyRanking[i];
        const user = userMap[item.user_id];
        
        if (user) {
          monthlyLeaderboard.push({
            id: user.id,
            rank: skip + i + 1,
            username: user.is_anonymous ? `Anonymous${user.id.toString().substring(0, 4)}` : user.username,
            displayName: user.is_anonymous ? `Anonymous User` : user.display_name,
            avatar: user.avatar || 'default-avatar.png',
            totalSpent: parseFloat(item.total_spent) || 0,
            badges: user.badges || [],
            theme: user.profile_theme || 'default'
          });
        }
      }
      
      // Compter le nombre total d'utilisateurs pour la pagination
      const [totalResult] = await connection.query(
        `SELECT 
          COUNT(DISTINCT user_id) as total
        FROM 
          payments
        WHERE 
          created_at >= ? AND 
          status = "completed"`,
        [startOfMonth.toISOString().slice(0, 19).replace('T', ' ')]
      );
      
      const total = totalResult[0].total || 0;
      
      // Libérer la connexion
      connection.release();
      
      // Renvoyer les résultats
      res.status(200).json({
        users: monthlyLeaderboard,
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      });
    } catch (error) {
      // Libérer la connexion en cas d'erreur
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du classement mensuel:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du classement mensuel', 
      error: error.message 
    });
  }
};

exports.getUserPosition = async (req, res) => {
  try {
    // Vérification que l'utilisateur est authentifié et disponible
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const userId = req.user.id;
    console.log('Récupération de la position utilisateur pour ID:', userId);
    
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Récupérer le montant total dépensé par l'utilisateur
      const [userInfo] = await connection.query(
        'SELECT total_spent FROM users WHERE id = ?',
        [userId]
      );
      
      if (userInfo.length === 0) {
        connection.release();
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      const userTotalSpent = parseFloat(userInfo[0].total_spent) || 0;
      
      // Calculer le rang global (nombre d'utilisateurs ayant dépensé plus)
      const [globalRankResult] = await connection.query(
        'SELECT COUNT(*) as rank FROM users WHERE total_spent > ?',
        [userTotalSpent]
      );
      
      const globalRank = globalRankResult[0].rank + 1; // +1 car le rang commence à 1
      
      // Date de début de la semaine courante (lundi)
      const now = new Date();
      const dayOfWeek = now.getDay() || 7; // Dimanche (0) devient 7
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek + 1); // Reculer jusqu'à lundi
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Calculer le total hebdomadaire de l'utilisateur (depuis lundi)
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
      
      // Libérer la connexion
      connection.release();
      
      // Renvoyer les données de classement
      res.status(200).json({
        global: {
          rank: globalRank,
          total: userTotalSpent
        },
        weekly: {
          rank: weeklyRank,
          total: userWeeklyTotal
        },
        monthly: {
          rank: monthlyRank,
          total: userMonthlyTotal
        }
      });
    } catch (error) {
      // En cas d'erreur, libérer la connexion
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la position de l\'utilisateur:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération de la position de l\'utilisateur', 
      error: error.message 
    });
  }
};

// Get nearby competitors
exports.getNearbyCompetitors = async (req, res) => {
  try {
    // Vérification que l'utilisateur est authentifié et disponible
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const userId = req.user.id;
    
    console.log('Récupération des concurrents proches pour ID:', userId);
    
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Récupérer d'abord les informations complètes de l'utilisateur
      const [userResults] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (userResults.length === 0) {
        connection.release();
        return res.status(404).json({ message: 'Utilisateur non trouvé' });
      }
      
      const userInfo = userResults[0];
      const totalSpent = parseFloat(userInfo.total_spent) || 0;
      
      console.log('Utilisateur trouvé avec un montant total de:', totalSpent);
      
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
      
      // Récupérer les badges pour chaque utilisateur
      const fetchBadgesForUser = async (userId) => {
        const [badges] = await connection.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [userId]
        );
        return badges.map(b => b.badge_name);
      };
      
      // Formater un utilisateur pour la réponse
      const formatUser = async (user, rank) => {
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
      };
      
      // Récupérer les badges de l'utilisateur courant
      const userBadges = await fetchBadgesForUser(userId);
      
      // Formater l'utilisateur courant
      const currentUser = {
        id: userInfo.id,
        rank: userRank,
        username: userInfo.username,
        displayName: userInfo.display_name || userInfo.username,
        avatar: userInfo.avatar || 'default-avatar.png',
        totalSpent: totalSpent,
        badges: userBadges,
        theme: userInfo.profile_theme || 'default',
        isCurrentUser: true
      };
      
      // Formater la réponse avec les concurrents au-dessus et en-dessous
      const aboveUsers = await Promise.all(above.map(async (user, i) => {
        return await formatUser(user, userRank - (above.length - i));
      }));
      
      const belowUsers = await Promise.all(below.map(async (user, i) => {
        return await formatUser(user, userRank + i + 1);
      }));
      
      // Libérer la connexion
      connection.release();
      
      // Envoyer la réponse
      const competitors = {
        above: aboveUsers,
        current: currentUser,
        below: belowUsers
      };
      
      console.log('Réponse prête à être envoyée avec', aboveUsers.length, 'utilisateurs au-dessus et', belowUsers.length, 'utilisateurs en-dessous');
      res.status(200).json(competitors);
    } catch (error) {
      // En cas d'erreur, libérer la connexion
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des concurrents proches:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des concurrents proches', error: error.message });
  }
};

// Get top 10 leaderboard
exports.getTop10 = async (req, res) => {
  try {
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Requête pour obtenir le top 10 des utilisateurs
      const [users] = await connection.query(
        `SELECT 
          id, username, display_name, avatar, total_spent, is_anonymous, profile_theme
        FROM 
          users
        ORDER BY 
          total_spent DESC
        LIMIT 10`
      );
      
      const leaderboard = [];
      
      // Pour chaque utilisateur, récupérer ses badges
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        // Récupérer les badges de l'utilisateur
        const [badges] = await connection.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [user.id]
        );
        
        leaderboard.push({
          id: user.id,
          rank: i + 1,
          username: user.is_anonymous ? `Anonymous${user.id.toString().substring(0, 4)}` : user.username,
          displayName: user.is_anonymous ? `Anonymous User` : user.display_name,
          avatar: user.avatar || 'default-avatar.png',
          totalSpent: parseFloat(user.total_spent) || 0,
          badges: badges.map(b => b.badge_name),
          theme: user.profile_theme || 'default'
        });
      }
      
      // Libérer la connexion
      connection.release();
      
      // Renvoyer les résultats
      res.status(200).json(leaderboard);
    } catch (error) {
      // Libérer la connexion en cas d'erreur
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du top 10:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du top 10', 
      error: error.message 
    });
  }
};

// Get top 100 leaderboard
exports.getTop100 = async (req, res) => {
  try {
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Requête pour obtenir le top 100 des utilisateurs
      const [users] = await connection.query(
        `SELECT 
          id, username, display_name, avatar, total_spent, is_anonymous, profile_theme
        FROM 
          users
        ORDER BY 
          total_spent DESC
        LIMIT 100`
      );
      
      const leaderboard = [];
      
      // Pour chaque utilisateur, récupérer ses badges
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        // Récupérer les badges de l'utilisateur
        const [badges] = await connection.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [user.id]
        );
        
        leaderboard.push({
          id: user.id,
          rank: i + 1,
          username: user.is_anonymous ? `Anonymous${user.id.toString().substring(0, 4)}` : user.username,
          displayName: user.is_anonymous ? `Anonymous User` : user.display_name,
          avatar: user.avatar || 'default-avatar.png',
          totalSpent: parseFloat(user.total_spent) || 0,
          badges: badges.map(b => b.badge_name),
          theme: user.profile_theme || 'default'
        });
      }
      
      // Libérer la connexion
      connection.release();
      
      // Renvoyer les résultats
      res.status(200).json(leaderboard);
    } catch (error) {
      // Libérer la connexion en cas d'erreur
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du top 100:', error);
    res.status(500).json({ 
      message: 'Erreur lors de la récupération du top 100', 
      error: error.message 
    });
  }
};
