/**
 * Point d'entrée pour Render
 * Ce fichier est nécessaire car Render cherche index.js par défaut
 * Il charge simplement notre serveur principal (server.js)
 */

console.log('Chargement de l\'application OneRun via index.js');
console.log('Cet index.js redirige vers server.js qui contient l\'application principale');

// Importer le fichier server.js principal
require('./server.js');
