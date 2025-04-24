const config = {
  // Configuration pour utiliser ngrok comme backend (remplacez l'URL par celle fournie par ngrok)
  apiUrl: process.env.REACT_APP_API_URL || 'VOTRE_URL_NGROK_ICI',
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'VOTRE_URL_NGROK_ICI',
  
  // Configuration pour développement local (commentée)
  // apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:8080',
  // socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://localhost:8080',
};

// Logging de configuration
console.log('Configuration API avec ngrok:', config);

export default config;
