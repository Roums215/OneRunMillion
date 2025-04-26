const pool = require('../config/db');
const User = require('./user.model.mysql');

class Payment {
  // Méthode pour créer un nouveau paiement
  static async create(paymentData) {
    try {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        
        // 1. Insérer le paiement
        const [result] = await conn.execute(
          `INSERT INTO payments (
            user_id, amount, currency, payment_method, 
            stripe_payment_id, crypto_transaction_id, status, 
            rank_before, description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            paymentData.userId,
            paymentData.amount,
            paymentData.currency || 'USD',
            paymentData.paymentMethod,
            paymentData.stripePaymentId || null,
            paymentData.cryptoTransactionId || null,
            paymentData.status || 'pending',
            paymentData.rankBefore || 0,
            paymentData.description || 'OneRun rank payment'
          ]
        );
        
        const paymentId = result.insertId;
        
        // 2. Mettre à jour le total dépensé de l'utilisateur si le statut est complété
        if (paymentData.status === 'completed') {
          // Utiliser la procédure stockée pour mettre à jour le total et les badges
          await conn.execute(
            'CALL update_user_after_payment(?, ?)',
            [paymentData.userId, paymentData.amount]
          );
        }
        
        // 3. Récupérer le classement actuel de l'utilisateur
        const [userRows] = await conn.execute(
          'SELECT current_rank FROM users WHERE id = ?',
          [paymentData.userId]
        );
        
        if (userRows.length > 0) {
          // 4. Mettre à jour le paiement avec le nouveau rang
          await conn.execute(
            'UPDATE payments SET rank_after = ? WHERE id = ?',
            [userRows[0].current_rank, paymentId]
          );
        }
        
        await conn.commit();
        
        // 5. Retourner le paiement complet
        return this.findById(paymentId);
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour trouver un paiement par ID
  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        `SELECT p.*, u.username, u.display_name, u.avatar 
         FROM payments p
         JOIN users u ON p.user_id = u.id
         WHERE p.id = ?`,
        [id]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour trouver les paiements d'un utilisateur
  static async findByUserId(userId, limit = 10, offset = 0) {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM payments 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );
      
      return rows;
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour mettre à jour le statut d'un paiement
  static async updateStatus(id, status) {
    try {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        
        // 1. Récupérer les informations du paiement
        const [paymentRows] = await conn.execute(
          'SELECT * FROM payments WHERE id = ?',
          [id]
        );
        
        if (paymentRows.length === 0) {
          throw new Error('Payment not found');
        }
        
        const payment = paymentRows[0];
        
        // 2. Mettre à jour le statut
        await conn.execute(
          'UPDATE payments SET status = ? WHERE id = ?',
          [status, id]
        );
        
        // 3. Si le statut passe à 'completed', mettre à jour le total dépensé
        if (status === 'completed' && payment.status !== 'completed') {
          // Utiliser la procédure stockée pour mettre à jour le total et les badges
          await conn.execute(
            'CALL update_user_after_payment(?, ?)',
            [payment.user_id, payment.amount]
          );
          
          // Récupérer le nouveau rang
          const [userRows] = await conn.execute(
            'SELECT current_rank FROM users WHERE id = ?',
            [payment.user_id]
          );
          
          if (userRows.length > 0) {
            await conn.execute(
              'UPDATE payments SET rank_after = ? WHERE id = ?',
              [userRows[0].current_rank, id]
            );
          }
        }
        
        // 4. Si le statut passe à 'refunded', soustraire du total dépensé
        if (status === 'refunded' && payment.status !== 'refunded') {
          await conn.execute(
            'UPDATE users SET total_spent = GREATEST(0, total_spent - ?) WHERE id = ?',
            [payment.amount, payment.user_id]
          );
        }
        
        await conn.commit();
        
        return this.findById(id);
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour obtenir les statistiques globales des paiements
  static async getStats() {
    try {
      const [totalRows] = await pool.execute(
        `SELECT SUM(amount) as total_amount, COUNT(*) as total_count 
         FROM payments 
         WHERE status = 'completed'`
      );
      
      const [weeklyRows] = await pool.execute(
        `SELECT SUM(amount) as weekly_amount, COUNT(*) as weekly_count 
         FROM payments 
         WHERE status = 'completed' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
      );
      
      const [monthlyRows] = await pool.execute(
        `SELECT SUM(amount) as monthly_amount, COUNT(*) as monthly_count 
         FROM payments 
         WHERE status = 'completed' 
         AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
      );
      
      return {
        total: {
          amount: totalRows[0].total_amount || 0,
          count: totalRows[0].total_count || 0
        },
        weekly: {
          amount: weeklyRows[0].weekly_amount || 0,
          count: weeklyRows[0].weekly_count || 0
        },
        monthly: {
          amount: monthlyRows[0].monthly_amount || 0,
          count: monthlyRows[0].monthly_count || 0
        }
      };
    } catch (error) {
      throw error;
    }
  }
  
  // Méthode pour obtenir le classement basé sur les paiements sur une période
  static async getLeaderboard(period = 'all', limit = 10, offset = 0) {
    try {
      let query = `
        SELECT u.id, u.username, u.display_name, u.avatar, u.current_rank, 
        u.profile_theme, SUM(p.amount) as total_paid
        FROM users u
        JOIN payments p ON u.id = p.user_id
        WHERE p.status = 'completed'
      `;
      
      const params = [];
      
      if (period === 'weekly') {
        query += ' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      } else if (period === 'monthly') {
        query += ' AND p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
      }
      
      query += ' GROUP BY u.id ORDER BY total_paid DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);
      
      const [rows] = await pool.execute(query, params);
      
      // Récupérer les badges pour chaque utilisateur
      for (const user of rows) {
        const [badges] = await pool.execute(
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
}

module.exports = Payment;
