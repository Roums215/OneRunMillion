# OneRun - Application de Classement Premium

Une application luxueuse et premium où les utilisateurs se disputent les positions du classement uniquement grâce à des contributions financières.

## Concept

OneRun offre une expérience de jeu unique qui repose sur un principe simple :
- Payez pour augmenter votre classement
- Aucun autre service ou produit - une compétition de statut pure
- Suivi du classement en temps réel
- Classements mondiaux, hebdomadaires et mensuels

## Stack Technique

### Frontend
- React pour l'expérience web
- Composants stylisés pour des éléments d'interface luxueux
- Redux pour la gestion des états

### Backend
- Node.js avec Express
- MongoDB pour les profils utilisateurs
- PostgreSQL pour les données de transaction
- Socket.io pour les mises à jour en temps réel

### Paiements
- Intégration de Stripe pour les paiements traditionnels
- (Futur) Options de paiement en cryptomonnaie

## Structure du Projet

```
onerun/
├── frontend/         # Application React
├── backend/          # Serveur Node.js Express
├── docs/             # Documentation
└── scripts/          # Scripts utilitaires
```

## Démarrage

### Prérequis
- Node.js (v14+)
- npm ou yarn
- MongoDB
- PostgreSQL
- Serveur web (comme Apache ou Nginx)

### Installation
Les instructions pour configurer l'environnement de développement seront ajoutées ici.

## Feuille de Route des Fonctionnalités

- [x] Configuration du projet
- [ ] Authentification des utilisateurs
- [ ] Fonctionnalité de classement de base
- [ ] Intégration des paiements (Stripe)
- [ ] Mises à jour en temps réel
- [ ] Personnalisation du profil
- [ ] Badges et récompenses
- [ ] Classements hebdomadaires/mensuels
- [ ] Système de notifications
