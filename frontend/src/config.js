const config = {
  // Configuration pour déploiement sur Netlify
  apiUrl: process.env.REACT_APP_API_URL || '',  // API relative au même domaine
  socketUrl: process.env.REACT_APP_SOCKET_URL || window.location.origin, // Socket.io via le même domaine
};

// Logging de configuration
console.log('Configuration API pour Netlify:', config);

export default config;