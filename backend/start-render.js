/**
 * Script de démarrage pour Render avec débogage renforcé
 * Ce script aide à identifier les problèmes au démarrage
 */

console.log('====== DÉMARRAGE DU SERVEUR ONERUN SUR RENDER ======');
console.log('Environnement Node.js:', process.version);
console.log('Répertoire de travail:', process.cwd());
console.log('Variables d\'environnement disponibles:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT);
console.log('- CORS_ORIGIN:', process.env.CORS_ORIGIN);
console.log('- BACKEND_URL:', process.env.BACKEND_URL);

// Liste des fichiers dans le répertoire courant
const fs = require('fs');
try {
  console.log('\nFichiers dans le répertoire courant:');
  const files = fs.readdirSync('./');
  files.forEach(file => console.log(`- ${file}`));
} catch (error) {
  console.error('Erreur lors de la lecture du répertoire:', error);
}

// Vérification de la connexion à la base de données
try {
  console.log('\nTentative de connexion à la base de données MySQL...');
  console.log('- MYSQL_HOST:', process.env.MYSQL_HOST ? 'Défini' : 'Non défini');
  console.log('- MYSQL_DATABASE:', process.env.MYSQL_DATABASE ? 'Défini' : 'Non défini');
  console.log('- MYSQL_USER:', process.env.MYSQL_USER ? 'Défini' : 'Non défini');
  console.log('- MYSQL_PASSWORD:', process.env.MYSQL_PASSWORD ? 'Défini (valeur cachée)' : 'Non défini');
} catch (error) {
  console.error('Erreur lors de la vérification des variables de base de données:', error);
}

// Démarrage du serveur
try {
  console.log('\nDémarrage du serveur...');
  require('./server.js');
} catch (error) {
  console.error('\n===== ERREUR AU DÉMARRAGE DU SERVEUR =====');
  console.error(error);
  process.exit(1);
}
