/**
 * Script de redirection API pour OneRun
 * Force l'utilisation de l'API Render au lieu du sous-domaine api IONOS inexistant
 */

// Exécuter immédiatement pour intercepter les requêtes API
(function() {
  console.log('🔄 Script de correction API OneRun - Redirection vers Render...');
  
  // Surcharger la configuration globale - ça devrait être chargé avant le reste de l'application
  window.API_URL = 'https://onerunmillion.onrender.com';
  
  // Fonction utilitaire pour modifier l'URL
  function fixApiUrl(url) {
    if (typeof url !== 'string') return url;
    
    // Corriger les URLs avec le sous-domaine api inexistant
    if (url.includes('api.s1043322554.onlinehome.fr')) {
      return url.replace('api.s1043322554.onlinehome.fr', 'onerunmillion.onrender.com');
    }
    
    // Corriger les chemins relatifs /api/
    if (url.startsWith('/api/')) {
      return 'https://onerunmillion.onrender.com' + url;
    }
    
    return url;
  }
  
  // Remplacer les fonctions de réseau
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      const newUrl = fixApiUrl(url);
      if (newUrl !== url) {
        console.log(`🔄 Correction Fetch: ${url} → ${newUrl}`);
      }
      return originalFetch(newUrl, options);
    };
  }
  
  if (window.XMLHttpRequest) {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      const newUrl = fixApiUrl(url);
      if (newUrl !== url) {
        console.log(`🔄 Correction XHR: ${url} → ${newUrl}`);
      }
      return originalXHROpen.call(this, method, newUrl, ...args);
    };
  }
  
  // Hook pour Socket.io (sera chargé plus tard)
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    if (tagName.toLowerCase() === 'script') {
      // Observer les changements de src pour intercepter socket.io
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && value && value.includes('socket.io')) {
          const newValue = fixApiUrl(value);
          if (newValue !== value) {
            console.log(`🔄 Correction Script Socket.io: ${value} → ${newValue}`);
            return originalSetAttribute.call(this, name, newValue);
          }
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    return element;
  };
  
  console.log('✅ Correction API activée - Toutes les requêtes API seront redirigées vers https://onerunmillion.onrender.com');
})();
