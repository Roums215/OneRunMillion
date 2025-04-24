# Guide de Déploiement OneRun sur Netlify

Ce guide vous explique comment déployer l'application OneRun sur Netlify en utilisant des fonctions serverless, tout en préservant son design luxueux avec les effets dorés et les animations sophistiquées.

## Préparation du déploiement

### 1. Créer un compte Netlify

Si vous n'avez pas encore de compte, inscrivez-vous sur [Netlify](https://app.netlify.com/signup).

### 2. Finaliser la préparation des fichiers

1. Assurez-vous que tous les fichiers suivants ont été créés :
   - `netlify.toml` (à la racine du projet)
   - Les fonctions serverless dans `/netlify/functions/`
   - Le fichier de configuration `.env.production`

2. Remplacez le fichier de configuration frontend par la version Netlify :
   ```
   cd frontend/src
   copy config.netlify.js config.js
   ```

3. Construisez le frontend optimisé :
   ```
   cd frontend
   npm run build
   ```

## Déploiement sur Netlify

### Option 1 : Déploiement via interface web

1. Allez sur [app.netlify.com](https://app.netlify.com/) et connectez-vous
2. Cliquez sur "New site from Git"
3. Choisissez votre fournisseur Git (GitHub, GitLab, Bitbucket)
4. Sélectionnez votre dépôt OneRun
5. Dans les paramètres de build, vérifiez que :
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/build`
6. Cliquez sur "Advanced build settings" et ajoutez les variables d'environnement :
   - `MYSQL_HOST`: db5017719755.hosting-data.io
   - `MYSQL_PORT`: 3306
   - `MYSQL_DATABASE`: dbs14159670
   - `MYSQL_USER`: dbu5173122
   - `MYSQL_PASSWORD`: Bdd2025OneRun!
   - `JWT_SECRET`: (votre clé secrète)
   - `STRIPE_SECRET_KEY`: (votre clé Stripe)
   - `STRIPE_WEBHOOK_SECRET`: (votre clé webhook)
7. Cliquez sur "Deploy site"

### Option 2 : Déploiement via Netlify CLI

1. Installez l'outil en ligne de commande Netlify :
   ```
   npm install -g netlify-cli
   ```

2. Connectez-vous à votre compte Netlify :
   ```
   netlify login
   ```

3. Initialisez votre projet pour Netlify :
   ```
   netlify init
   ```

4. Suivez les instructions pour configurer votre site
   - Choisissez "Create & configure a new site"
   - Sélectionnez votre équipe
   - Donnez un nom à votre site (par exemple "onerun-premium")

5. Configurez les variables d'environnement :
   ```
   netlify env:import .env.production
   ```

6. Déployez votre site :
   ```
   netlify deploy --prod
   ```

## Vérification et configuration après déploiement

1. Une fois le déploiement terminé, Netlify vous fournira une URL (par exemple `https://onerun-premium.netlify.app`)

2. Testez votre application en vérifiant :
   - Le chargement correct du design luxueux (effets dorés, animations, etc.)
   - La fonctionnalité d'authentification (inscription/connexion)
   - Le chargement du tableau de bord avec les classements
   - Les paiements via Stripe

3. Configuration du webhook Stripe :
   - Allez dans le tableau de bord Stripe
   - Dans Développeurs > Webhooks > Ajouter un endpoint
   - Entrez l'URL : `https://votre-site.netlify.app/.netlify/functions/payments/webhook`
   - Sélectionnez les événements `payment_intent.succeeded`
   - Copiez la clé de signature et mettez à jour la variable d'environnement `STRIPE_WEBHOOK_SECRET`

## Dépannage

Si vous rencontrez des problèmes :

1. **Problèmes avec les fonctions serverless** :
   Consultez les logs dans Netlify > Votre site > Functions

2. **Problèmes de base de données** :
   Vérifiez que les informations de connexion MySQL sont correctes et que la base de données est accessible depuis l'extérieur

3. **Problèmes CORS** :
   Les fonctions Netlify étant sur le même domaine que le frontend, les problèmes CORS devraient être évités

4. **Design non chargé correctement** :
   Vérifiez les logs de la console du navigateur pour détecter d'éventuelles erreurs de chargement des ressources

## Préservation du design luxueux

Le design luxueux de OneRun avec ses caractéristiques distinctives est entièrement préservé dans ce déploiement :

- **Accents dorés et blancs** : les styles CSS sont compilés dans le build de production
- **Animations subtiles** : comme l'effet d'argent qui tombe, fonctionnent parfaitement
- **Effets de lumière et reflets** : sont maintenus grâce au chargement correct des assets
- **Transformations 3D** : sur les cartes et les boutons restent intactes

Cette approche serverless avec Netlify offre l'avantage de maintenir la cohérence visuelle et l'esthétique premium de l'application tout en simplifiant considérablement le déploiement et la maintenance.
