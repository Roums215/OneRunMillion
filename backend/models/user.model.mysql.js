const bcrypt = require('bcryptjs');
const pool = require('../config/db');

class User {
  // Méthode pour créer un nouvel utilisateur
  static async create(userData) {
    console.log('====== DÉBUT CRÉATION UTILISATEUR ======');
    console.log('Données reçues:', { ...userData, password: '[MASQUÉ]' });
    
    let connection = null;
    try {
      // Obtenir une connexion directe depuis le pool pour avoir plus de contrôle
      console.log('Demande de connexion au pool MySQL...');
      connection = await pool.getConnection();
      console.log('Connexion MySQL obtenue avec succès');
      
      // Commencer une transaction
      console.log('Début de la transaction...');
      await connection.beginTransaction();
      console.log('Transaction démarrée avec succès');
      
      // Hasher le mot de passe
      console.log('Hachage du mot de passe...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      console.log('Mot de passe haché avec succès');
      
      // Préparer les données pour l'insertion
      const username = userData.username;
      const email = userData.email;
      const displayName = userData.displayName || userData.username;
      const avatar = userData.avatar || 'default-avatar.png';
      const isAnonymous = userData.isAnonymous ? 1 : 0; // Convertir le booléen en 0/1 pour MySQL
      
      console.log('Préparation de l\'insertion avec paramètres:', {
        username,
        email,
        displayName,
        avatar,
        isAnonymous
      });
      
      // Vérifier que la table existe
      console.log('Vérification de la présence de la table users...');
      const [tables] = await connection.query('SHOW TABLES LIKE \'users\'');
      if (tables.length === 0) {
        throw new Error('Table users non trouvée dans la base de données');
      }
      console.log('Table users trouvée dans la base de données');
      
      // Vérifier la structure de la table
      console.log('Vérification de la structure de la table users...');
      const [columns] = await connection.query('DESCRIBE users');
      console.log('Structure de la table users:', columns.map(c => c.Field).join(', '));
      
      // Exécuter la requête d'insertion
      console.log('Exécution de la requête d\'insertion...');
      const [result] = await connection.query(
        'INSERT INTO users (username, email, password, display_name, avatar, is_anonymous) VALUES (?, ?, ?, ?, ?, ?)',
        [
          username,
          email,
          hashedPassword,
          displayName,
          avatar,
          isAnonymous
        ]
      );
      console.log('Requête INSERT exécutée, ID généré:', result.insertId);
      
      // Valider la transaction
      console.log('Validation de la transaction...');
      await connection.commit();
      console.log('Transaction validée avec succès');
      
      // Libérer la connexion
      connection.release();
      console.log('Connexion libérée');
      
      // Récupérer les détails complets de l'utilisateur créé
      console.log('Récupération des détails complets de l\'utilisateur...');
      const user = await this.findById(result.insertId);
      console.log('Utilisateur récupéré:', user ? 'succès' : 'non trouvé');
      
      console.log('====== FIN CRÉATION UTILISATEUR (SUCCÈS) ======');
      return user;
    } catch (error) {
      console.error('====== ERREUR CRÉATION UTILISATEUR ======');
      console.error('Type d\'erreur:', error.name);
      console.error('Message d\'erreur:', error.message);
      console.error('Stack trace:', error.stack);
      
      // Annuler la transaction si elle a été démarrée
      if (connection) {
        try {
          console.log('Tentative d\'annulation de la transaction...');
          await connection.rollback();
          console.log('Transaction annulée avec succès');
        } catch (rollbackError) {
          console.error('Erreur lors de l\'annulation de la transaction:', rollbackError.message);
        } finally {
          connection.release();
          console.log('Connexion libérée après erreur');
        }
      }
      
      console.error('====== FIN ERREUR CRÉATION UTILISATEUR ======');
      throw error;
    }
  }
  
  // Méthode pour trouver un utilisateur par ID
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      return rows[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour trouver un utilisateur par ID avec ses badges
  static async findByIdWithBadges(id) {
    try {
      console.log(`Début de la recherche de l'utilisateur ${id} avec badges`);
      if (!id) {
        console.error('ID utilisateur non fourni pour findByIdWithBadges');
        return null;
      }
      
      // Récupérer l'utilisateur
      const [users] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (users.length === 0) {
        console.warn(`Aucun utilisateur trouvé avec l'ID ${id}`);
        return null;
      }
      
      const user = users[0];
      console.log(`Utilisateur trouvé: ${user.username}`);
      
      // Récupérer les badges de l'utilisateur
      let badges = [];
      try {
        const [badgeResults] = await pool.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [id]
        );
        badges = badgeResults.map(b => b.badge_name);
        console.log(`${badges.length} badges trouvés pour l'utilisateur`);
      } catch (badgeError) {
        console.error('Erreur lors de la récupération des badges:', badgeError);
        // Continuer même si les badges ne peuvent pas être récupérés
      }
      
      // Récupérer les effets du profil utilisateur
      let effects = [];
      try {
        const [effectResults] = await pool.query(
          'SELECT effect_name FROM profile_effects WHERE user_id = ?',
          [id]
        );
        effects = effectResults.map(e => e.effect_name);
        console.log(`${effects.length} effets trouvés pour l'utilisateur`);
      } catch (effectError) {
        console.error('Erreur lors de la récupération des effets:', effectError);
        // Continuer même si les effets ne peuvent pas être récupérés
      }
      
      // Construire et retourner l'objet utilisateur complet
      const userWithDetails = {
        ...user,
        badges: badges,
        profileCustomization: {
          theme: user.profile_theme || 'default',
          effects: effects
        }
      };
      
      console.log(`Utilisateur ${id} récupéré avec succès`);
      return userWithDetails;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'utilisateur ${id} avec badges:`, error);
      // Retourner un objet utilisateur minimal plutôt que de lancer une erreur
      return {
        id: id,
        username: 'Utilisateur inconnu',
        display_name: 'Utilisateur inconnu',
        avatar: 'default-avatar.png',
        total_spent: 0,
        current_rank: 0,
        badges: [],
        profileCustomization: {
          theme: 'default',
          effects: []
        }
      };
    }
  }
  
  // Méthode pour trouver un utilisateur par nom d'utilisateur
  static async findByUsername(username) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
      
      if (rows.length === 0) return null;
      
      const user = rows[0];
      
      // Récupérer les badges
      const [badges] = await pool.query(
        'SELECT badge_name FROM user_badges WHERE user_id = ?',
        [user.id]
      );
      
      // Récupérer les effets
      const [effects] = await pool.query(
        'SELECT effect_name FROM profile_effects WHERE user_id = ?',
        [user.id]
      );
      
      return {
        ...user,
        badges: badges.map(b => b.badge_name),
        profileCustomization: {
          theme: user.profile_theme,
          effects: effects.map(e => e.effect_name)
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour trouver un utilisateur par email
  static async findByEmail(email) {
    try {
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      
      if (rows.length === 0) return null;
      
      const user = rows[0];
      
      // Récupérer les badges
      const [badges] = await pool.query(
        'SELECT badge_name FROM user_badges WHERE user_id = ?',
        [user.id]
      );
      
      // Récupérer les effets
      const [effects] = await pool.query(
        'SELECT effect_name FROM profile_effects WHERE user_id = ?',
        [user.id]
      );
      
      return {
        ...user,
        badges: badges.map(b => b.badge_name),
        profileCustomization: {
          theme: user.profile_theme,
          effects: effects.map(e => e.effect_name)
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour comparer les mots de passe
  static async comparePassword(hashedPassword, candidatePassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }
  
  // Méthode pour mettre à jour le rang d'un utilisateur
  static async updateRank(userId, newRank) {
    try {
      const [result] = await pool.query(
        'UPDATE users SET current_rank = ? WHERE id = ?',
        [newRank, userId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour mettre à jour le total dépensé
  static async updateTotalSpent(userId, amount) {
    try {
      // Utiliser la procédure stockée pour mettre à jour le total et les badges
      await pool.query(
        'CALL update_user_after_payment(?, ?)',
        [userId, amount]
      );
      
      return this.findById(userId);
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour obtenir le classement des utilisateurs
  static async getLeaderboard(limit = 10, offset = 0) {
    try {
      const [rows] = await pool.query(
        `SELECT id, username, display_name, avatar, total_spent, current_rank, 
         profile_theme
         FROM users 
         ORDER BY total_spent DESC 
         LIMIT ? OFFSET ?`,
        [limit, offset]
      );
      
      // Récupérer les badges pour chaque utilisateur
      for (const user of rows) {
        const [badges] = await pool.query(
          'SELECT badge_name FROM user_badges WHERE user_id = ?',
          [user.id]
        );
        
        user.badges = badges.map(b => b.badge_name);
      }
      
      return rows;
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour mettre à jour un utilisateur
  static async update(userId, updateData) {
    try {
      // Construire la requête dynamiquement
      let query = 'UPDATE users SET ';
      const params = [];
      const updateFields = [];
      
      // Ajouter chaque champ à mettre à jour
      if (updateData.displayName) {
        updateFields.push('display_name = ?');
        params.push(updateData.displayName);
      }
      
      if (updateData.avatar) {
        updateFields.push('avatar = ?');
        params.push(updateData.avatar);
      }
      
      if (updateData.isAnonymous !== undefined) {
        updateFields.push('is_anonymous = ?');
        params.push(updateData.isAnonymous);
      }
      
      if (updateData.profileTheme) {
        updateFields.push('profile_theme = ?');
        params.push(updateData.profileTheme);
      }
      
      if (updateData.password) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(updateData.password, salt);
        updateFields.push('password = ?');
        params.push(hashedPassword);
      }
      
      // Compléter la requête
      query += updateFields.join(', ') + ' WHERE id = ?';
      params.push(userId);
      
      // Exécuter la mise à jour si des champs sont spécifiés
      if (updateFields.length > 0) {
        await pool.query(query, params);
      }
      
      // Mettre à jour les effets si nécessaire
      if (updateData.effects && Array.isArray(updateData.effects)) {
        // Supprimer les effets existants
        await pool.query('DELETE FROM profile_effects WHERE user_id = ?', [userId]);
        
        // Ajouter les nouveaux effets
        for (const effect of updateData.effects) {
          await pool.query(
            'INSERT INTO profile_effects (user_id, effect_name) VALUES (?, ?)',
            [userId, effect]
          );
        }
      }
      
      return this.findById(userId);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
