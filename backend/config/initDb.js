const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

// Fonction pour initialiser la base de données
const initializeDatabase = async () => {
  // Lire les paramètres de connexion depuis les variables d'environnement
  const config = {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    multipleStatements: true
  };

  try {
    // Créer une connexion sans spécifier de base de données
    const connection = await mysql.createConnection(config);
    
    console.log('Vérifiant l\'existence de la base de données OneRun...');
    
    // Vérifier si la base de données existe
    const [rows] = await connection.execute(
      "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'onerun'"
    );
    
    // Si la base de données n'existe pas, créer la base et les tables
    if (rows.length === 0) {
      console.log('Base de données OneRun non trouvée. Création en cours...');
      
      // Lire le fichier SQL
      const sqlFilePath = path.join(__dirname, 'database.sql');
      const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
      
      // Séparer le script en commandes individuelles (ne pas utiliser de DELIMITER)
      const commands = sqlScript.split(';').filter(cmd => cmd.trim().length > 0);
      
      // Exécuter chaque commande séparément
      for (const cmd of commands) {
        try {
          if (cmd.includes('DELIMITER')) continue; // Ignorer les commandes DELIMITER
          await connection.query(cmd + ';');
        } catch (cmdError) {
          console.warn('Erreur lors de l\'exécution de la commande SQL:', cmdError.message);
          // Continuer avec les autres commandes même si une échoue
        }
      }
      
      console.log('Base de données OneRun créée avec succès!');
    } else {
      console.log('Base de données OneRun déjà existante.');
    }
    
    // Fermer la connexion
    await connection.end();
    
    console.log('Initialisation de la base de données terminée.');
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    throw error;
  }
};

module.exports = initializeDatabase;
