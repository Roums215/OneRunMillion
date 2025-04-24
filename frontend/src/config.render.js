const config = {
  // Configuration pour déploiement avec backend sur Render.com
  apiUrl: process.env.REACT_APP_API_URL || 'https://onerun-api.onrender.com',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'https://onerun-api.onrender.com',
};

// Logging de configuration
console.log('Configuration API pour Render:', config);

export default config;
