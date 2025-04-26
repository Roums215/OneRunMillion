const mysql = require('mysql2/promise');

// Fonction pour se connecter à MySQL
const connectDB = async () => {
  try {
    // Créer un pool de connexions
    const pool = mysql.createPool({
      host: process.env.MYSQL_HOST || 'localhost',
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'onerun',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Vérifier la connexion
    const connection = await pool.getConnection();
    console.log(`MySQL Connected: ${connection.config.host}`);
    connection.release();
    
    return pool;
  } catch (error) {
    console.error(`Error connecting to MySQL: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
