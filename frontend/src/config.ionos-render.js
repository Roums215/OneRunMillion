const config = {
  // Configuration pour frontend IONOS avec backend sur Render
  apiUrl: process.env.REACT_APP_API_URL || 'https://onerun-api.onrender.com', // Vous remplacerez avec l'URL réelle après déploiement
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'https://onerun-api.onrender.com',
};

// Logging de configuration
console.log('Configuration API pour IONOS + Render:', config);

export default config;
