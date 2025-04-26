const config = {
  // Configuration pour production (IONOS)
  apiUrl: process.env.REACT_APP_API_URL || 'https://api.s1043322554.onlinehome.fr',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'https://api.s1043322554.onlinehome.fr',
  
  // Configuration pour développement local (commentée)
  // apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  // socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://localhost:8080',
};

// Logging de configuration
console.log('Configuration API pour IONOS:', config);

export default config;