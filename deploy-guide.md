# Guide de Déploiement OneRun sur IONOS

Ce guide détaille les étapes nécessaires pour déployer l'application OneRun sur l'hébergement IONOS, tout en préservant son design luxueux et sophistiqué.

## 1. Préparation des fichiers

### Frontend (interface utilisateur React)
Le build optimisé du frontend se trouve dans le dossier `frontend/build`. Ce dossier contient l'application React compilée avec tous les éléments visuels luxueux (animations en or, effets de lumière, etc.).

### Backend (API Node.js)
Les fichiers du backend se trouvent dans le dossier `backend`. Le fichier `.env.production` contient la configuration optimisée pour IONOS.

## 2. Déploiement sur IONOS

### Étape 1 : Configuration des domaines
1. Accédez au panneau de contrôle IONOS
2. Configurez le domaine principal pour le frontend : `s1043322554.onlinehome.fr`
3. Créez un sous-domaine pour l'API : `api.s1043322554.onlinehome.fr`

### Étape 2 : Upload des fichiers
1. **Frontend** :
   - Téléchargez tout le contenu du dossier `frontend/build` vers le répertoire racine du domaine principal
   - Créez un fichier `.htaccess` à la racine avec le contenu suivant :
   ```
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

2. **Backend** :
   - Téléchargez tout le contenu du dossier `backend` vers le répertoire du sous-domaine API
   - Ne téléchargez PAS le dossier `node_modules`
   - Renommez le fichier `.env.production` en `.env` sur le serveur

### Étape 3 : Configuration de la base de données MySQL
1. La base de données est déjà configurée sur IONOS avec les paramètres suivants :
   - Hôte : db5017719755.hosting-data.io
   - Port : 3306
   - Base de données : dbs14159670
   - Utilisateur : dbu5173122
   - Mot de passe : Bdd2025OneRun!

2. Exécutez le script d'initialisation (une fois connecté en SSH) :
   ```
   cd /chemin/vers/backend
   node deploy-ionos.js
   ```

### Étape 4 : Installation des dépendances backend
1. Connectez-vous via SSH à votre hébergement IONOS
2. Naviguez vers le dossier du backend :
   ```
   cd /chemin/vers/backend
   ```
3. Installez les dépendances :
   ```
   npm install --production
   ```

### Étape 5 : Démarrage du serveur avec PM2
1. Installez PM2 globalement :
   ```
   npm install -g pm2
   ```
2. Démarrez l'application :
   ```
   pm2 start server.js --name "onerun-api"
   ```
3. Configurez le démarrage automatique :
   ```
   pm2 save
   pm2 startup
   ```

## 3. Vérification du déploiement

1. Accédez à votre site : `https://s1043322554.onlinehome.fr`
2. Vérifiez que le design luxueux est correctement affiché (animations dorées, effets de lumière, etc.)
3. Testez la connexion, l'inscription et le tableau de bord
4. Vérifiez que les paiements fonctionnent correctement

## 4. Dépannage

Si vous rencontrez des problèmes :

1. Vérifiez les logs du serveur backend :
   ```
   pm2 logs onerun-api
   ```
2. Assurez-vous que les ports sont correctement configurés dans IONOS
3. Vérifiez que le CORS est correctement configuré dans le fichier `.env`

---

**Note importante sur le design** : L'application OneRun a été conçue avec une esthétique luxueuse comprenant des accents dorés, des animations subtiles, et des effets visuels sophistiqués. Ce design premium doit être préservé lors du déploiement.
