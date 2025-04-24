const config = {
  // Configuration pour frontend Netlify avec proxy pour backend Render
  apiUrl: process.env.NODE_ENV === 'production'
    ? '/.netlify/functions/api-proxy' // Utilise le proxy Netlify en production
    : 'https://onerunmillion.onrender.com', // URL directe pour le développement local
  
  socketUrl: process.env.NODE_ENV === 'production'
    ? '/.netlify/functions/api-proxy' // Utilise le proxy Netlify en production
    : 'https://onerunmillion.onrender.com', // URL directe pour le développement local
  
  // Configurations visuelles (préservation du design luxueux)
  theme: {
    primaryColor: '#d4af37', // Or
    textColor: '#ffffff',    // Blanc
    backgroundColor: '#121212', // Noir/foncé
    accentColor: '#f5f5f5'   // Accent clair
  }
};

// Logging de configuration
console.log('Configuration API pour Netlify + Render:', config);

export default config;
