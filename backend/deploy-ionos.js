/**
 * Script de déploiement pour IONOS
 * Ce script permet d'initialiser la base de données sur le serveur IONOS
 * et de mettre en place les configurations nécessaires.
 * 
 * Base de données IONOS:
 * - Hôte : db5017719755.hosting-data.io
 * - Base de données : dbs14159670
 * - Utilisateur : dbu5173122
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Charger les variables d'environnement de production
dotenv.config({ path: '.env.production' });

// Fonction pour initialiser la base de données
async function initDatabase() {
  console.log('Démarrage de l\'initialisation de la base de données sur IONOS...');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'config', 'database.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Diviser le fichier SQL en requêtes individuelles
    const sqlQueries = sqlContent
      .split(';')
      .filter(query => query.trim() !== '')
      .map(query => query.trim() + ';');
    
    // Créer une connexion à la base de données
    const connection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      multipleStatements: true
    });
    
    console.log(`Connecté à la base de données MySQL sur ${process.env.MYSQL_HOST}`);
    
    // Exécuter chaque requête SQL
    for (const query of sqlQueries) {
      try {
        console.log(`Exécution de la requête: ${query.substring(0, 60)}...`);
        await connection.query(query);
      } catch (err) {
        console.warn(`Avertissement lors de l'exécution de la requête: ${err.message}`);
        // Continuer malgré les erreurs (table déjà existante, etc.)
      }
    }
    
    console.log('Base de données initialisée avec succès !');

    // Insérer des données de test si nécessaire
    if (process.argv.includes('--with-sample-data')) {
      await insertSampleData(connection);
    }
    
    // Fermer la connexion
    await connection.end();
    console.log('Connexion à la base de données fermée.');
    
  } catch (error) {
    console.error('Erreur lors de l\'initialisation de la base de données:', error);
    process.exit(1);
  }
}

// Fonction pour insérer des données de test
async function insertSampleData(connection) {
  console.log('Insertion des données de test...');
  
  try {
    // Insérer un utilisateur de test si inexistant
    await connection.query(`
      INSERT INTO users (username, email, password, display_name, total_spent, current_rank)
      SELECT 'admin', 'admin@example.com', '$2b$10$VG4rfoFrEzX5yP3NupIhG.dV8Af5nQm5Z5iqgvqKj0qpZJ4aYwuoe', 'Administrateur', 100, 1
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');
    `);
    
    console.log('Données de test insérées avec succès !');
  } catch (error) {
    console.error('Erreur lors de l\'insertion des données de test:', error);
  }
}

// Exécuter le script
initDatabase().then(() => {
  console.log('Déploiement terminé !');
}).catch(err => {
  console.error('Erreur lors du déploiement:', err);
  process.exit(1);
});
