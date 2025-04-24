const config = {
  // Configuration pour frontend IONOS avec backend sur Render
  apiUrl: process.env.REACT_APP_API_URL || 'https://onerunmillion.onrender.com', // URL réelle du backend Render
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'https://onerunmillion.onrender.com',
};

// Logging de configuration
console.log('Configuration API pour IONOS + Render:', config);

export default config;
