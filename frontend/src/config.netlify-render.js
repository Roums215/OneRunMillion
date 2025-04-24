const config = {
  // Configuration pour frontend Netlify avec backend sur Render
  apiUrl: process.env.REACT_APP_API_URL || 'https://onerunmillion.onrender.com',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'https://onerunmillion.onrender.com',
};

// Logging de configuration
console.log('Configuration API pour Netlify + Render:', config);

export default config;
