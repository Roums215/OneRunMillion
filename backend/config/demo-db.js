/**
 * Module de simulation de base de données en mode démo
 * À utiliser lorsque la connexion à la base de données MySQL n'est pas disponible
 */

const demoUsers = [
  {
    id: 1,
    username: "luxeuser",
    email: "demo@onerun.com",
    display_name: "Démo Premium",
    avatar: "gold-avatar.png",
    total_spent: 5000.00,
    current_rank: 1,
    is_anonymous: false,
    profile_theme: "gold"
  },
  {
    id: 2,
    username: "silveruser",
    email: "silver@onerun.com",
    display_name: "Argent Démo",
    avatar: "silver-avatar.png",
    total_spent: 2500.00,
    current_rank: 2,
    is_anonymous: false,
    profile_theme: "default"
  },
  {
    id: 3,
    username: "bronzeuser",
    email: "bronze@onerun.com",
    display_name: "Bronze Démo",
    avatar: "bronze-avatar.png",
    total_spent: 1000.00,
    current_rank: 3,
    is_anonymous: false,
    profile_theme: "default"
  }
];

// Base de données démo
const demoDB = {
  users: demoUsers,
  payments: [
    { id: 1, user_id: 1, amount: 1000.00, status: "completed", created_at: "2025-04-20T10:00:00Z" },
    { id: 2, user_id: 1, amount: 2000.00, status: "completed", created_at: "2025-04-21T14:30:00Z" },
    { id: 3, user_id: 1, amount: 2000.00, status: "completed", created_at: "2025-04-22T09:15:00Z" },
    { id: 4, user_id: 2, amount: 1200.00, status: "completed", created_at: "2025-04-21T11:45:00Z" },
    { id: 5, user_id: 2, amount: 1300.00, status: "completed", created_at: "2025-04-23T16:20:00Z" },
    { id: 6, user_id: 3, amount: 1000.00, status: "completed", created_at: "2025-04-22T10:30:00Z" }
  ],
  badges: [
    { id: 1, user_id: 1, badge_name: "premium", badge_icon: "gold-star.png" },
    { id: 2, user_id: 1, badge_name: "early_adopter", badge_icon: "pioneer.png" },
    { id: 3, user_id: 2, badge_name: "consistent", badge_icon: "silver-medal.png" }
  ]
};

// Connexion à la base de données simulée
const connectDB = async () => {
  console.log('Mode DÉMO activé - Utilisation d\'une base de données en mémoire');
  // Simuler un délai pour rendre le comportement plus réaliste
  await new Promise(resolve => setTimeout(resolve, 300));
  return { query: simulateQuery };
};

// Fonction pour simuler des requêtes SQL
const simulateQuery = async (sql, params) => {
  console.log('Requête SQL simulée en mode DÉMO:', sql);
  
  // Simuler différentes requêtes SQL courantes
  if (sql.toLowerCase().includes('select * from users')) {
    return [demoDB.users, {}];
  } 
  else if (sql.toLowerCase().includes('select * from payments')) {
    return [demoDB.payments, {}];
  }
  else if (sql.toLowerCase().includes('select * from badges')) {
    return [demoDB.badges, {}];
  }
  else if (sql.toLowerCase().includes('select * from users where id =')) {
    const userId = params[0];
    const user = demoDB.users.find(u => u.id === userId);
    return [[user || null], {}];
  }
  else if (sql.toLowerCase().includes('select * from users where username =')) {
    const username = params[0];
    const user = demoDB.users.find(u => u.username === username);
    return [[user || null], {}];
  }
  else if (sql.toLowerCase().includes('select * from users where email =')) {
    const email = params[0];
    const user = demoDB.users.find(u => u.email === email);
    return [[user || null], {}];
  }
  else if (sql.toLowerCase().includes('insert into')) {
    return [{ insertId: 999 }, {}];
  }
  else if (sql.toLowerCase().includes('update')) {
    return [{ affectedRows: 1 }, {}];
  }
  else {
    return [[], {}];
  }
};

const initDb = async () => {
  console.log('Initialisation de la base de données DÉMO');
  return true;
};

module.exports = { connectDB, initDb };
