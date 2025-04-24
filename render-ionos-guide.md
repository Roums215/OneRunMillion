# Guide de Déploiement OneRun : Backend sur Render avec Frontend sur IONOS

Ce guide vous explique comment déployer le backend de OneRun sur Render.com tout en utilisant votre frontend déjà hébergé sur IONOS, préservant ainsi les éléments luxueux du design (accents dorés, animations sophistiquées, effets visuels premium).

## 1. Préparation du frontend sur IONOS

Votre interface est déjà hébergée sur IONOS, mais nous devons la mettre à jour pour qu'elle communique avec le backend sur Render :

1. Créez un fichier `config.ionos-render.js` dans le dossier frontend/src :
   ```javascript
   const config = {
     // Configuration pour frontend IONOS avec backend sur Render
     apiUrl: process.env.REACT_APP_API_URL || 'https://onerun-api.onrender.com', // Remplacez par l'URL réelle de votre API Render
     socketUrl: process.env.REACT_APP_SOCKET_URL || 'https://onerun-api.onrender.com', // Remplacez par la même URL
   };
   
   // Logging de configuration
   console.log('Configuration API IONOS avec backend Render:', config);
   
   export default config;
   ```

2. Remplacez le fichier `config.js` actuel par ce nouveau fichier
3. Reconstruisez votre frontend :
   ```
   cd frontend
   npm run build
   ```
4. Téléchargez les fichiers mis à jour vers votre espace IONOS (dossier `frontend/build`)

## 2. Déploiement du backend sur Render.com

### Préparation du projet

1. Assurez-vous que votre code est bien sur GitHub avec les fichiers suivants :
   - `backend/render.yaml` (déjà configuré pour IONOS)
   - `backend/.env.render` (déjà configuré pour IONOS)

2. Accédez au [Dashboard Render](https://dashboard.render.com/)

3. Créez un compte ou connectez-vous

### Option 1 : Déploiement avec "Blueprint" (recommandé)

1. Cliquez sur "New" puis "Blueprint"
2. Connectez votre compte GitHub
3. Sélectionnez le dépôt `Roums215/OneRunMillion`
4. Render va détecter le fichier `render.yaml` et vous proposer de déployer les services définis
5. Vérifiez les paramètres et cliquez sur "Apply"
6. Render va automatiquement configurer et déployer votre API

### Option 2 : Déploiement manuel

1. Cliquez sur "New" puis "Web Service"
2. Connectez votre compte GitHub et sélectionnez le dépôt `Roums215/OneRunMillion`
3. Configurez les paramètres :
   - **Name** : onerun-api
   - **Root Directory** : backend
   - **Environment** : Node
   - **Build Command** : npm install
   - **Start Command** : node server.js
   - **Plan** : Free ($0/month)

4. Dans "Advanced" > "Environment Variables", ajoutez les variables d'environnement suivantes :
   - `NODE_ENV` : production
   - `PORT` : 10000
   - `MYSQL_HOST` : db5017719755.hosting-data.io
   - `MYSQL_PORT` : 3306
   - `MYSQL_DATABASE` : dbs14159670
   - `MYSQL_USER` : dbu5173122
   - `MYSQL_PASSWORD` : Bdd2025OneRun!
   - `JWT_SECRET` : 3a97f8c6d5e4b2a1f0c9d8e7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0
   - `JWT_EXPIRATION` : 7d
   - `CORS_ORIGIN` : https://s1043322554.onlinehome.fr

5. Cliquez sur "Create Web Service"

## 3. Configuration du webhook Stripe

1. Allez dans le tableau de bord Stripe > Développeurs > Webhooks
2. Cliquez sur "Ajouter un endpoint"
3. Entrez l'URL de votre webhook Render : `https://onerun-api.onrender.com/api/payments/webhook`
4. Sélectionnez les événements `payment_intent.succeeded`
5. Copiez la clé de signature et mettez-à-jour la variable `STRIPE_WEBHOOK_SECRET` dans votre service Render

## 4. Test et vérification

1. Une fois le backend déployé sur Render, notez l'URL générée (par exemple `https://onerun-api.onrender.com`)
2. Mettez à jour votre fichier de configuration frontend si l'URL est différente de celle prévue
3. Accédez à votre site sur IONOS (https://s1043322554.onlinehome.fr)
4. Vérifiez que :
   - Le design luxueux est préservé avec tous ses éléments distinctifs :
     - Accents dorés et blancs sur fond sombre
     - Animations subtiles (effet de monnaie qui tombe)
     - Effets de lumière et reflets sur les surfaces
     - Transformations 3D sur les cartes et boutons
   - L'authentification fonctionne
   - Le tableau de bord se charge correctement et affiche les classements
   - Les paiements via Stripe fonctionnent

## Notes sur la préservation du design luxueux

Cette configuration garantit que tous les éléments visuels haut de gamme de OneRun sont préservés :

- **Palette de couleurs or et blanc** sur fond sombre reste intacte car c'est le frontend qui la gère
- **Animations sophistiquées** comme les effets de transition et les mouvements subtils continuent de fonctionner
- **Effets visuels premium** comme les rayons lumineux et les reflets sont conservés
- **Visualisation élégante des classements** est maintenue pour montrer clairement les contributions des utilisateurs

La seule différence est qu'au lieu d'utiliser un backend sur IONOS, vous utilisez maintenant un backend sur Render, ce qui peut offrir de meilleures performances et une maintenance plus simple.

## Dépannage

Si vous rencontrez des problèmes :

- **Erreurs CORS** : Vérifiez que `CORS_ORIGIN` dans Render pointe exactement vers votre domaine IONOS
- **Problèmes d'authentification** : Vérifiez que `JWT_SECRET` est correctement configuré
- **Problèmes de base de données** : Vérifiez les logs Render pour voir les erreurs de connexion MySQL
- **Problèmes visuels** : Assurez-vous que tous les fichiers CSS et JS sont correctement chargés

Pour tout problème persistant, consultez les logs sur Render pour identifier la source exacte des erreurs.
