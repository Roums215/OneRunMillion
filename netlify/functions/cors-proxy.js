// OneRun Premium API Gateway - Version ultra-simplifiée
const https = require('https');
const url = require('url');

exports.handler = async function(event) {
  // Répondre immédiatement aux requêtes OPTIONS (pré-vol CORS)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Max-Age': '86400'
      },
      body: ''
    };
  }

  // Configuration de base
  const RENDER_API_URL = 'onerunmillion.onrender.com';
  const path = event.path.replace('/.netlify/functions/cors-proxy', '') || '/';
  const method = event.httpMethod;
  const requestBody = event.body || null;
  
  // Construire les paramètres de requête
  const queryString = event.queryStringParameters 
    ? '?' + Object.entries(event.queryStringParameters)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
    : '';
    
  console.log(`✨ OneRun Premium Gateway: ${method} https://${RENDER_API_URL}${path}${queryString}`);

  // Utiliser l'API native https pour éviter les problèmes avec axios
  return new Promise((resolve, reject) => {
    const options = {
      hostname: RENDER_API_URL,
      port: 443,
      path: `${path}${queryString}`,
      method: method,
      headers: {
        'Content-Type': event.headers['content-type'] || 'application/json',
        'User-Agent': 'OneRunPremiumGateway/2.0'
      }
    };
    
    // Ajouter l'en-tête d'autorisation s'il existe
    if (event.headers.authorization) {
      options.headers['Authorization'] = event.headers.authorization;
    }
    
    // Ajouter le Content-Length si nous avons un corps de requête
    if (requestBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.headers['Content-Length'] = Buffer.byteLength(requestBody);
    }

    const req = https.request(options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        // Formater la réponse
        console.log(`✨ Gateway response: Status ${res.statusCode}`);
        
        let formattedBody = responseBody;
        // Si la réponse est JSON, on essaie de la formater proprement
        if (res.headers['content-type'] && res.headers['content-type'].includes('application/json')) {
          try {
            // Vérifier si c'est déjà un objet JSON valide
            JSON.parse(responseBody);
            formattedBody = responseBody;
          } catch (e) {
            // Sinon, on retourne tel quel
            formattedBody = JSON.stringify({ data: responseBody });
          }
        }
        
        resolve({
          statusCode: res.statusCode,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Content-Type': res.headers['content-type'] || 'application/json'
          },
          body: formattedBody
        });
      });
    });
    
    // Gérer les erreurs de requête
    req.on('error', (error) => {
      console.error('❌ Gateway error:', error);
      resolve({
        statusCode: 502,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          error: 'Impossible de contacter le backend',
          details: error.message,
          time: new Date().toISOString()
        })
      });
    });
    
    // Envoyer le corps de la requête si nécessaire
    if (requestBody && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      req.write(requestBody);
    }
    
    req.end();
  });
};
