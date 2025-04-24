const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key');
const User = require('../models/user.model.mysql');
const connectDB = require('../config/db');
const { io } = require('../server');

// Pool de connexion MySQL
let pool;
async function getPool() {
  if (!pool) {
    pool = await connectDB();
  }
  return pool;
}

// Process payment
exports.processPayment = async (req, res) => {
  try {
    const { amount, paymentMethod } = req.body;
    const user = req.user;
    
    // Validate amount (minimum $1)
    if (!amount || amount < 1) {
      return res.status(400).json({ message: 'Minimum payment amount is $1' });
    }
    
    // Vérifier que l'utilisateur est authentifié
    if (!user || !user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    console.log(`Traitement du paiement pour l'utilisateur: ${user.username} (ID: ${user.id}), montant: ${amount}$`);
    
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    const connection = await pool.getConnection();
    
    try {
      // Commencer une transaction
      await connection.beginTransaction();
      
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        payment_method: paymentMethod,
        confirm: true,
        description: `OneRun rank payment for ${user.username}`,
        metadata: {
          userId: user.id.toString()
        }
      });
      
      if (paymentIntent.status === 'succeeded') {
        // Récupérer le rang de l'utilisateur avant le paiement
        const [rankBeforeResult] = await connection.query(
          'SELECT COUNT(*) as rank FROM users WHERE total_spent > ?',
          [parseFloat(user.total_spent) || 0]
        );
        const rankBefore = rankBeforeResult[0].rank + 1;
        
        // Mettre à jour le total dépensé de l'utilisateur
        await connection.query(
          'UPDATE users SET total_spent = total_spent + ? WHERE id = ?',
          [amount, user.id]
        );
        
        // Récupérer le nouvel utilisateur pour obtenir le total_spent mis à jour
        const [updatedUsers] = await connection.query(
          'SELECT * FROM users WHERE id = ?',
          [user.id]
        );
        
        if (updatedUsers.length === 0) {
          await connection.rollback();
          connection.release();
          return res.status(404).json({ message: 'Utilisateur non trouvé après mise à jour' });
        }
        
        const updatedUser = updatedUsers[0];
        const newTotalSpent = parseFloat(updatedUser.total_spent) || 0;
        
        // Récupérer le rang de l'utilisateur après le paiement
        const [rankAfterResult] = await connection.query(
          'SELECT COUNT(*) as rank FROM users WHERE total_spent > ?',
          [newTotalSpent]
        );
        const rankAfter = rankAfterResult[0].rank + 1;
        
        // Créer l'enregistrement de paiement dans la base de données
        const [paymentResult] = await connection.query(
          `INSERT INTO payments 
           (user_id, amount, currency, payment_method, stripe_payment_id, status, rank_before, rank_after, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [user.id, amount, 'USD', 'credit_card', paymentIntent.id, 'completed', rankBefore, rankAfter]
        );
        
        // Valider la transaction
        await connection.commit();
        
        // Obtenir l'ID du paiement
        const paymentId = paymentResult.insertId;
        
        // Libérer la connexion
        connection.release();
        
        // Émettre une mise à jour en temps réel à tous les clients connectés
        io.to('leaderboard').emit('leaderboard_update', {
          userId: user.id,
          newTotalSpent: newTotalSpent,
          newRank: rankAfter
        });
        
        // Vérifier si l'utilisateur a dépassé quelqu'un
        if (rankBefore !== rankAfter) {
          // Trouver les utilisateurs qui ont été dépassés
          const [overtakenUsers] = await pool.query(
            'SELECT id FROM users WHERE total_spent < ? AND total_spent > ?',
            [newTotalSpent, newTotalSpent - amount]
          );
          
          // Notifier les utilisateurs dépassés
          overtakenUsers.forEach(overtakenUser => {
            io.to(`user_${overtakenUser.id}`).emit('rank_change', {
              message: 'Someone has overtaken you on the leaderboard!',
              newRank: rankAfter + 1
            });
          });
        }
        
        // Mettre à jour les badges de l'utilisateur en fonction du montant total dépensé
        await User.updateTotalSpent(user.id, amount);
        
        res.status(200).json({
          message: 'Payment successful',
          payment: {
            id: paymentId,
            amount,
            status: 'completed',
            rankBefore,
            rankAfter
          }
        });
      } else {
        await connection.rollback();
        connection.release();
        res.status(400).json({ message: 'Payment failed', status: paymentIntent.status });
      }
    } catch (error) {
      // Annuler la transaction et libérer la connexion en cas d'erreur
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors du traitement du paiement:', error);
    res.status(500).json({ message: 'Error processing payment', error: error.message });
  }
};

// Get payment history for a user
exports.getPaymentHistory = async (req, res) => {
  let connection;
  try {
    // Vérifier que l'utilisateur est authentifié
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }
    
    const userId = req.user.id;
    console.log(`Récupération de l'historique des paiements pour l'utilisateur ${userId}`);
    
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;
    
    // Obtenir le pool de connexion MySQL
    pool = await getPool();
    connection = await pool.getConnection();
    
    try {
      // Vérifier si la table payments existe
      const [tables] = await connection.query(
        "SHOW TABLES LIKE 'payments'"
      );
      
      if (tables.length === 0) {
        console.log('La table payments n\'existe pas encore, renvoyer un historique vide');
        connection.release();
        return res.status(200).json({
          payments: [],
          total: 0,
          pages: 0,
          currentPage: parseInt(page)
        });
      }
      
      // Récupérer les paiements de l'utilisateur
      const [payments] = await connection.query(
        `SELECT 
          id, user_id, amount, currency, payment_method, status, 
          stripe_payment_id, rank_before, rank_after, created_at 
        FROM 
          payments 
        WHERE 
          user_id = ? 
        ORDER BY 
          created_at DESC 
        LIMIT ?, ?`,
        [userId, parseInt(skip), parseInt(limit)]
      );
      
      // Compter le nombre total de paiements
      const [totalResult] = await connection.query(
        'SELECT COUNT(*) as total FROM payments WHERE user_id = ?',
        [userId]
      );
      
      const total = totalResult[0].total;
      console.log(`${total} paiements trouvés pour l'utilisateur ${userId}`);
      
      // Mettre en forme les paiements pour la réponse
      const formattedPayments = payments.map(payment => ({
        id: payment.id,
        userId: payment.user_id,
        amount: parseFloat(payment.amount) || 0,
        currency: payment.currency || 'USD',
        paymentMethod: payment.payment_method || 'card',
        status: payment.status || 'completed',
        stripePaymentId: payment.stripe_payment_id || '',
        rankBefore: payment.rank_before || 0,
        rankAfter: payment.rank_after || 0,
        createdAt: payment.created_at
      }));
      
      const responseData = {
        payments: formattedPayments,
        total,
        pages: Math.ceil(total / limit),
        currentPage: parseInt(page)
      };
      
      // Libérer la connexion avant d'envoyer la réponse
      connection.release();
      connection = null;
      
      console.log('Historique des paiements envoyé avec succès');
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Erreur SQL lors de la récupération des paiements:', error);
      throw error;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des paiements:', error);
    // Envoyer une réponse réussie mais avec tableau vide pour ne pas bloquer le tableau de bord
    return res.status(200).json({ 
      message: 'Erreur récupérée avec succès', 
      payments: [], 
      total: 0, 
      pages: 0, 
      currentPage: parseInt(req.query.page || 1)
    });
  } finally {
    // S'assurer que la connexion est libérée même en cas d'erreur
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Erreur lors de la libération de la connexion:', releaseError);
      }
    }
  }
};

// Handle Stripe webhook
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  
  let event;
  
  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || 'whsec_dummy_secret'
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  
  // Obtenir le pool de connexion MySQL
  pool = await getPool();
  
  // Handle specific events
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const userId = paymentIntent.metadata.userId;
    
    const connection = await pool.getConnection();
    
    try {
      // Commencer une transaction
      await connection.beginTransaction();
      
      // Rechercher le paiement
      const [payments] = await connection.query(
        'SELECT * FROM payments WHERE stripe_payment_id = ?',
        [paymentIntent.id]
      );
      
      if (payments.length > 0 && payments[0].status !== 'completed') {
        const payment = payments[0];
        const amount = parseFloat(payment.amount);
        
        // Mettre à jour le statut du paiement
        await connection.query(
          'UPDATE payments SET status = ? WHERE id = ?',
          ['completed', payment.id]
        );
        
        // Récupérer l'utilisateur
        const [users] = await connection.query(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );
        
        if (users.length > 0) {
          const user = users[0];
          const currentTotalSpent = parseFloat(user.total_spent) || 0;
          
          // Récupérer le rang de l'utilisateur avant le paiement
          const [rankBeforeResult] = await connection.query(
            'SELECT COUNT(*) as rank FROM users WHERE total_spent > ?',
            [currentTotalSpent]
          );
          const rankBefore = rankBeforeResult[0].rank + 1;
          
          // Mettre à jour le total dépensé de l'utilisateur
          await connection.query(
            'UPDATE users SET total_spent = total_spent + ? WHERE id = ?',
            [amount, userId]
          );
          
          // Récupérer le nouvel utilisateur pour obtenir le total_spent mis à jour
          const [updatedUsers] = await connection.query(
            'SELECT * FROM users WHERE id = ?',
            [userId]
          );
          
          const updatedUser = updatedUsers[0];
          const newTotalSpent = parseFloat(updatedUser.total_spent) || 0;
          
          // Récupérer le rang de l'utilisateur après le paiement
          const [rankAfterResult] = await connection.query(
            'SELECT COUNT(*) as rank FROM users WHERE total_spent > ?',
            [newTotalSpent]
          );
          const rankAfter = rankAfterResult[0].rank + 1;
          
          // Mettre à jour le paiement avec les rangs
          await connection.query(
            'UPDATE payments SET rank_before = ?, rank_after = ? WHERE id = ?',
            [rankBefore, rankAfter, payment.id]
          );
          
          // Valider la transaction
          await connection.commit();
          
          // Émettre une mise à jour en temps réel à tous les clients connectés
          io.to('leaderboard').emit('leaderboard_update', {
            userId: userId,
            newTotalSpent: newTotalSpent,
            newRank: rankAfter
          });
          
          // Mettre à jour les badges de l'utilisateur en fonction du montant total dépensé
          await User.updateTotalSpent(userId, amount);
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement du webhook de paiement:', error);
      await connection.rollback();
    } finally {
      connection.release();
    }
  } else if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object;
    
    const connection = await pool.getConnection();
    
    try {
      // Rechercher le paiement
      const [payments] = await connection.query(
        'SELECT * FROM payments WHERE stripe_payment_id = ?',
        [paymentIntent.id]
      );
      
      if (payments.length > 0) {
        // Mettre à jour le statut du paiement
        await connection.query(
          'UPDATE payments SET status = ? WHERE id = ?',
          ['failed', payments[0].id]
        );
      }
    } catch (error) {
      console.error('Erreur lors du traitement du webhook d\'échec de paiement:', error);
    } finally {
      connection.release();
    }
  }
  
  res.status(200).json({ received: true });
};
