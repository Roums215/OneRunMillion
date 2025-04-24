# Guide de Déploiement OneRun avec Backend sur Render.com

Ce guide vous explique comment déployer l'application OneRun avec un frontend sur Netlify et un backend sur Render.com, tout en préservant son design luxueux avec les effets dorés, animations sophistiquées et éléments visuels premium.

## 1. Déploiement du backend sur Render.com

### Préparation du projet

1. Assurez-vous que tous les fichiers nécessaires sont présents dans votre dépôt GitHub :
   - `backend/render.yaml`
   - `backend/.env.render`

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
   - `CORS_ORIGIN` : https://onerun-premium.netlify.app (remplacer par votre domaine Netlify)

5. Cliquez sur "Create Web Service"

## 2. Configuration du frontend pour utiliser le backend Render

1. Dans votre projet local, remplacez le fichier de configuration frontend par la version Render :
   ```
   cd frontend/src
   copy config.render.js config.js
   ```

2. Mettez à jour l'URL de l'API dans `config.render.js` avec l'URL fournie par Render (par exemple `https://onerun-api.onrender.com`)

3. Faites un commit et poussez ces changements vers GitHub :
   ```
   git add .
   git commit -m "Update configuration for Render backend"
   git push origin main
   ```

## 3. Déploiement du frontend sur Netlify

1. Allez sur [app.netlify.com](https://app.netlify.com/) et connectez-vous
2. Cliquez sur "New site from Git"
3. Choisissez GitHub comme fournisseur
4. Sélectionnez votre dépôt OneRunMillion
5. Dans les paramètres de build, vérifiez que :
   - **Base directory** : (laissez vide)
   - **Build command** : cd frontend && npm install && npm run build
   - **Publish directory** : frontend/build

6. Dans "Advanced build settings", ajoutez ces variables d'environnement :
   - `REACT_APP_API_URL` : l'URL de votre backend Render (ex. https://onerun-api.onrender.com)

7. Cliquez sur "Deploy site"

## 4. Configuration du webhook Stripe

1. Allez dans le tableau de bord Stripe > Développeurs > Webhooks
2. Cliquez sur "Ajouter un endpoint"
3. Entrez l'URL de votre webhook Render : `https://onerun-api.onrender.com/api/payments/webhook`
4. Sélectionnez les événements `payment_intent.succeeded`
5. Copiez la clé de signature et mettez-à-jour la variable `STRIPE_WEBHOOK_SECRET` dans votre service Render

## 5. Vérification du déploiement

1. Accédez à votre site Netlify (ex. https://onerun-premium.netlify.app)
2. Vérifiez que :
   - Le design luxueux est préservé (accents dorés, animations, effets de lumière)
   - L'authentification fonctionne
   - Le tableau de bord se charge correctement
   - Les paiements via Stripe fonctionnent

## Notes importantes sur le design luxueux

OneRun a été conçu avec une esthétique visuelle premium qui comprend :

- **Palette de couleurs luxueuse** : Combinaison d'or et de blanc sur fond sombre
- **Animations subtiles** : Effets de billets qui tombent et transitions fluides
- **Effets de lumière** : Rayons et reflets qui donnent de la profondeur
- **Éléments 3D** : Transformations et rotations sur les cartes et boutons
- **UI sophistiquée** : Boutons, cartes et visualisations de données élégantes

Ce déploiement avec Netlify (frontend) et Render (backend) préserve intégralement cette expérience visuelle haut de gamme.

## Dépannage

Si vous rencontrez des problèmes :

- **Erreurs CORS** : Vérifiez que `CORS_ORIGIN` dans Render pointe vers votre domaine Netlify exact
- **Problèmes d'authentification** : Vérifiez que `JWT_SECRET` est correctement configuré
- **Problèmes de base de données** : Vérifiez les logs Render pour voir les erreurs de connexion MySQL
- **Problèmes visuels** : Inspectez la console du navigateur pour détecter d'éventuelles erreurs de chargement des ressources

Pour tout problème persistant, consultez les logs sur Render et Netlify pour identifier la source exacte des erreurs.
