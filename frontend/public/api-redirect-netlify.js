/**
 * Script de redirection API pour OneRun sur Netlify
 * Force l'utilisation de l'API Render au lieu du sous-domaine api IONOS inexistant
 */

// Exécuter immédiatement pour intercepter les requêtes API
(function() {
  console.log('✨ OneRun Premium API Redirector - Netlify Edition');
  
  // Configuration globale pour l'API
  window.ONERUN_CONFIG = {
    apiUrl: 'https://onerunmillion.onrender.com',
    socketUrl: 'https://onerunmillion.onrender.com'
  };
  
  console.log('🌟 Configuration de luxe activée:', window.ONERUN_CONFIG);
  
  // Fonction pour corriger les URLs API
  function fixApiUrl(url) {
    if (typeof url !== 'string') return url;
    
    // Corriger le sous-domaine API inexistant
    if (url.includes('api.s1043322554.onlinehome.fr')) {
      return url.replace('api.s1043322554.onlinehome.fr', 'onerunmillion.onrender.com');
    }
    
    // Corriger les chemins API relatifs
    if (url.startsWith('/api/')) {
      return 'https://onerunmillion.onrender.com' + url;
    }
    
    // Corriger les chemins Socket.io
    if (url.includes('/socket.io/')) {
      return url.replace(/(https?:\/\/[^\/]+)?\/socket\.io\//, 'https://onerunmillion.onrender.com/socket.io/');
    }
    
    return url;
  }
  
  // Intercepter les requêtes fetch
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      const newUrl = fixApiUrl(url);
      if (newUrl !== url) {
        console.log(`✨ Correction Fetch: ${url} → ${newUrl}`);
      }
      return originalFetch(newUrl, options);
    };
  }
  
  // Intercepter XMLHttpRequest
  if (window.XMLHttpRequest) {
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
      const newUrl = fixApiUrl(url);
      if (newUrl !== url) {
        console.log(`✨ Correction XHR: ${url} → ${newUrl}`);
      }
      return originalXHROpen.call(this, method, newUrl, ...args);
    };
  }
  
  // Surveiller la création de scripts Socket.io
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(document, tagName);
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src' && value && value.includes('socket.io')) {
          const newValue = fixApiUrl(value);
          if (newValue !== value) {
            console.log(`✨ Correction Socket.io: ${value} → ${newValue}`);
            return originalSetAttribute.call(this, name, newValue);
          }
        }
        return originalSetAttribute.call(this, name, value);
      };
    }
    return element;
  };
  
  // Corriger la configuration importée dynamiquement
  const originalImport = window.import;
  if (originalImport) {
    window.import = function(url) {
      if (url && url.includes('config')) {
        return Promise.resolve({
          default: window.ONERUN_CONFIG
        });
      }
      return originalImport(url);
    };
  }
  
  // Observer les modifications DOM pour intercepter les scripts Socket.io
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.tagName === 'SCRIPT' && node.src && node.src.includes('socket.io')) {
          const newSrc = fixApiUrl(node.src);
          if (newSrc !== node.src) {
            console.log(`✨ Correction Script injecté: ${node.src} → ${newSrc}`);
            node.src = newSrc;
          }
        }
      });
    });
  });
  
  // Démarrer l'observation une fois le DOM chargé
  document.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true });
    console.log('✨ Observateur DOM activé pour les scripts Socket.io');
  });
  
  console.log('💎 OneRun Premium - Redirection API activée - Tous les éléments visuels luxueux préservés');
})();
