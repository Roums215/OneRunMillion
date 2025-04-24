const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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

// Mise à jour du rang de l'utilisateur en fonction du montant
async function updateUserRank(userId, amount) {
  const connection = await getConnection();
  
  try {
    // Récupérer le total actuel de l'utilisateur
    const [userResult] = await connection.query(
      'SELECT total_spent, current_rank FROM users WHERE id = ?',
      [userId]
    );
    
    if (userResult.length === 0) {
      await connection.end();
      return null;
    }
    
    const user = userResult[0];
    const oldRank = user.current_rank;
    const newTotal = parseFloat(user.total_spent) + parseFloat(amount);
    
    // Déterminer le nouveau rang
    let newRank = oldRank;
    
    if (newTotal >= 1000000) newRank = 10;
    else if (newTotal >= 500000) newRank = 9;
    else if (newTotal >= 250000) newRank = 8;
    else if (newTotal >= 100000) newRank = 7;
    else if (newTotal >= 50000) newRank = 6;
    else if (newTotal >= 25000) newRank = 5;
    else if (newTotal >= 10000) newRank = 4;
    else if (newTotal >= 5000) newRank = 3;
    else if (newTotal >= 1000) newRank = 2;
    else if (newTotal >= 100) newRank = 1;
    
    // Mettre à jour le total et le rang de l'utilisateur
    await connection.query(
      'UPDATE users SET total_spent = ?, current_rank = ? WHERE id = ?',
      [newTotal, newRank, userId]
    );
    
    // Attribuer des badges en fonction du nouveau rang (si nécessaire)
    if (newRank > oldRank) {
      // Badges basés sur le rang
      let badgeToAdd = null;
      
      if (newRank === 10) badgeToAdd = 'diamond';
      else if (newRank === 8) badgeToAdd = 'platinum';
      else if (newRank === 6) badgeToAdd = 'gold';
      else if (newRank === 4) badgeToAdd = 'silver';
      else if (newRank === 2) badgeToAdd = 'bronze';
      
      if (badgeToAdd) {
        await connection.query(
          'INSERT IGNORE INTO user_badges (user_id, badge_name) VALUES (?, ?)',
          [userId, badgeToAdd]
        );
      }
      
      // Badges basés sur le montant total
      if (newTotal >= 1000000) {
        await connection.query(
          'INSERT IGNORE INTO user_badges (user_id, badge_name) VALUES (?, ?)',
          [userId, 'millionaire']
        );
      }
    }
    
    await connection.end();
    
    return {
      oldRank,
      newRank,
      oldTotal: parseFloat(user.total_spent),
      newTotal
    };
  } catch (error) {
    await connection.end();
    throw error;
  }
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
    const path = event.path.replace(/^\\/api\\/payments\\//, '');
    
    // Endpoint: /api/payments/process (nécessite authentification)
    if (path === 'process' && event.httpMethod === 'POST') {
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
      const { amount, paymentMethodId, currency = 'usd' } = JSON.parse(event.body);
      
      if (!amount || amount <= 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid payment amount' })
        };
      }
      
      // Créer l'intention de paiement avec Stripe
      try {
        let paymentIntent;
        
        if (paymentMethodId) {
          // Créer une intention de paiement avec une méthode de paiement spécifiée
          paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convertir en centimes
            currency,
            payment_method: paymentMethodId,
            confirm: true,
            metadata: { userId }
          });
        } else {
          // Créer une intention de paiement sans confirmation immédiate
          paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convertir en centimes
            currency,
            metadata: { userId }
          });
        }
        
        // Récupérer la position actuelle de l'utilisateur
        const connection = await getConnection();
        
        try {
          const [userRankResult] = await connection.query(
            'SELECT COUNT(*) as rank FROM users WHERE total_spent > ?',
            [tokenVerification.user.total_spent]
          );
          
          const rankBefore = userRankResult[0].rank + 1;
          
          // Enregistrer le paiement dans la base de données
          const [paymentResult] = await connection.query(
            `INSERT INTO payments 
             (user_id, amount, currency, payment_method, status, stripe_payment_id, rank_before) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              userId, 
              amount, 
              currency, 
              'card', 
              paymentIntent.status, 
              paymentIntent.id, 
              rankBefore
            ]
          );
          
          const paymentId = paymentResult.insertId;
          
          // Mettre à jour le rang de l'utilisateur si le paiement est réussi
          let rankUpdate = null;
          if (paymentIntent.status === 'succeeded') {
            rankUpdate = await updateUserRank(userId, amount);
            
            // Mettre à jour le rank_after dans le paiement
            if (rankUpdate) {
              await connection.query(
                'UPDATE payments SET rank_after = ? WHERE id = ?',
                [rankUpdate.newRank, paymentId]
              );
            }
          }
          
          await connection.end();
          
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              paymentIntent: {
                id: paymentIntent.id,
                status: paymentIntent.status,
                client_secret: paymentIntent.client_secret
              },
              payment: {
                id: paymentId,
                amount,
                currency,
                status: paymentIntent.status
              },
              rankUpdate
            })
          };
        } catch (error) {
          await connection.end();
          throw error;
        }
      } catch (stripeError) {
        console.error('Stripe error:', stripeError);
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            message: 'Payment processing failed', 
            error: stripeError.message 
          })
        };
      }
    }
    
    // Endpoint: /api/payments/history (nécessite authentification)
    else if (path === 'history' && event.httpMethod === 'GET') {
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
      const queryParams = new URLSearchParams(event.queryStringParameters || {});
      const page = parseInt(queryParams.get('page') || 1);
      const limit = parseInt(queryParams.get('limit') || 10);
      const skip = (page - 1) * limit;
      
      const connection = await getConnection();
      
      try {
        // Vérifier si la table payments existe
        const [tables] = await connection.query(
          "SHOW TABLES LIKE 'payments'"
        );
        
        if (tables.length === 0) {
          await connection.end();
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              payments: [],
              total: 0,
              pages: 0,
              currentPage: page
            })
          };
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
          [userId, skip, limit]
        );
        
        // Compter le nombre total de paiements
        const [totalResult] = await connection.query(
          'SELECT COUNT(*) as total FROM payments WHERE user_id = ?',
          [userId]
        );
        
        const total = totalResult[0].total;
        
        await connection.end();
        
        // Mettre en forme les paiements pour la réponse
        const formattedPayments = payments.map(payment => ({
          id: payment.id,
          userId: payment.user_id,
          amount: parseFloat(payment.amount) || 0,
          currency: payment.currency || 'usd',
          paymentMethod: payment.payment_method || 'card',
          status: payment.status || 'completed',
          stripePaymentId: payment.stripe_payment_id || '',
          rankBefore: payment.rank_before || 0,
          rankAfter: payment.rank_after || 0,
          createdAt: payment.created_at
        }));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            payments: formattedPayments,
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
    
    // Endpoint: /api/payments/webhook (pour les webhooks Stripe)
    else if (path === 'webhook' && event.httpMethod === 'POST') {
      const payload = event.body;
      const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
      
      if (!signature) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Stripe signature missing' })
        };
      }
      
      try {
        // Vérifier la signature du webhook
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        const stripeEvent = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
        
        // Traiter l'événement en fonction de son type
        if (stripeEvent.type === 'payment_intent.succeeded') {
          const paymentIntent = stripeEvent.data.object;
          const userId = paymentIntent.metadata.userId;
          const amount = paymentIntent.amount / 100; // Convertir de centimes à l'unité
          
          if (userId) {
            // Mettre à jour le paiement dans la base de données
            const connection = await getConnection();
            
            try {
              await connection.query(
                'UPDATE payments SET status = ? WHERE stripe_payment_id = ?',
                ['completed', paymentIntent.id]
              );
              
              // Mettre à jour le rang de l'utilisateur
              const rankUpdate = await updateUserRank(userId, amount);
              
              if (rankUpdate) {
                // Mettre à jour le rank_after dans le paiement
                await connection.query(
                  'UPDATE payments SET rank_after = ? WHERE stripe_payment_id = ?',
                  [rankUpdate.newRank, paymentIntent.id]
                );
              }
              
              await connection.end();
            } catch (error) {
              await connection.end();
              throw error;
            }
          }
        }
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ received: true })
        };
      } catch (error) {
        console.error('Webhook error:', error);
        
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: error.message })
        };
      }
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
    console.error('Payments function error:', error);
    
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
