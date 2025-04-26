/**
 * Script pour préparer le déploiement du frontend sur IONOS
 * Ce script s'assure que le build contient tous les fichiers nécessaires
 * et crée un fichier .htaccess pour la redirection sur IONOS.
 */

const fs = require('fs');
const path = require('path');

// Vérifier si le dossier build existe
const buildPath = path.join(__dirname, 'build');
if (!fs.existsSync(buildPath)) {
  console.error("Le dossier 'build' n'existe pas. Veuillez exécuter 'npm run build' avant d'utiliser ce script.");
  process.exit(1);
}

// Créer le fichier .htaccess pour IONOS
const htaccessContent = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Activer CORS
<IfModule mod_headers.c>
  Header set Access-Control-Allow-Origin "*"
  Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
  Header set Access-Control-Allow-Headers "Origin, X-Requested-With, Content-Type, Accept, Authorization"
</IfModule>

# Optimisation de la mise en cache
<IfModule mod_expires.c>
  ExpiresActive On
  # Images
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/webp "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType image/x-icon "access plus 1 year"
  # Video
  ExpiresByType video/mp4 "access plus 1 year"
  ExpiresByType video/webm "access plus 1 year"
  # CSS, JavaScript
  ExpiresByType text/css "access plus 1 month"
  ExpiresByType text/javascript "access plus 1 month"
  ExpiresByType application/javascript "access plus 1 month"
  # Autres
  ExpiresByType application/pdf "access plus 1 month"
  ExpiresByType application/x-font-woff "access plus 1 month"
</IfModule>
`;

// Écrire le fichier .htaccess dans le dossier build
const htaccessPath = path.join(buildPath, '.htaccess');
fs.writeFileSync(htaccessPath, htaccessContent);
console.log("Fichier .htaccess créé avec succès.");

// Créer un fichier robots.txt
const robotsContent = `User-agent: *
Allow: /

Sitemap: https://s1043322554.onlinehome.fr/sitemap.xml
`;

// Écrire le fichier robots.txt dans le dossier build
const robotsPath = path.join(buildPath, 'robots.txt');
fs.writeFileSync(robotsPath, robotsContent);
console.log("Fichier robots.txt créé avec succès.");

// Créer un fichier sitemap.xml simple
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://s1043322554.onlinehome.fr/</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://s1043322554.onlinehome.fr/leaderboard</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://s1043322554.onlinehome.fr/login</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://s1043322554.onlinehome.fr/register</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
`;

// Écrire le fichier sitemap.xml dans le dossier build
const sitemapPath = path.join(buildPath, 'sitemap.xml');
fs.writeFileSync(sitemapPath, sitemapContent);
console.log("Fichier sitemap.xml créé avec succès.");

console.log("\nLa préparation du déploiement est terminée !");
console.log("Contenu du dossier build prêt à être téléchargé vers IONOS.");
console.log("Veuillez suivre les étapes décrites dans le fichier deploy-guide.md pour finaliser le déploiement.");
