// Netlify Serverless Function Deluxe pour contourner les problèmes CORS
// Optimisé pour OneRun Luxury Edition
const axios = require('axios');

exports.handler = async function(event) {
  // Configuration de base pour cette fonction
  const RENDER_API_URL = 'https://onerunmillion.onrender.com';
  
  // Gérer les requêtes OPTIONS (preflight CORS) immédiatement
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

  try {
    // Extraire les informations de la requête
    const path = event.path.replace('/.netlify/functions/cors-proxy', '');
    const targetUrl = `${RENDER_API_URL}${path || '/'}`; // Assurer un chemin valide
    const method = event.httpMethod;
    const headers = event.headers || {};
    const queryParams = event.queryStringParameters || {};
    
    // Traiter le corps de la requête correctement
    let body;
    if (event.body) {
      if (headers['content-type'] && headers['content-type'].includes('application/json')) {
        try {
          // Si le corps est déjà une chaîne JSON, on le parse
          body = JSON.parse(event.body);
        } catch (e) {
          // Sinon on utilise le corps tel quel
          body = event.body;
        }
      } else {
        body = event.body;
      }
    }
    
    console.log(`✨ Proxy request: ${method} ${targetUrl}`);
    console.log(`✨ Query params:`, queryParams);
    if (body) console.log(`✨ Body type: ${typeof body}`);

    // Configuration de la requête vers le backend Render
    const requestConfig = {
      method: method,
      url: targetUrl,
      params: queryParams,
      headers: {
        // Transmettre seulement les headers nécessaires
        'Content-Type': headers['content-type'] || 'application/json',
        'Authorization': headers['authorization'],
        'User-Agent': 'OneRunLuxuryProxy/1.0'
      },
      data: method !== 'GET' && method !== 'HEAD' && body ? body : undefined,
      validateStatus: () => true, // Ne pas rejeter les réponses avec des codes d'erreur HTTP
      timeout: 29000 // Timeout avant la limite de 30s de Netlify Functions
    };

    // Nettoyer les headers undefined
    Object.keys(requestConfig.headers).forEach(key => {
      if (requestConfig.headers[key] === undefined) delete requestConfig.headers[key];
    });

    // Faire la requête au backend
    const response = await axios(requestConfig);

    console.log(`✨ Proxy response: ${response.status} for ${targetUrl}`);

    // Retourner la réponse avec les CORS headers
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': response.headers['content-type'] || 'application/json'
      },
      body: typeof response.data === 'object' ? JSON.stringify(response.data) : response.data.toString()
    };
  } catch (error) {
    console.log('❌ Proxy error:', error);
    
    // Réponse d'erreur complète avec informations de débogage
    return {
      statusCode: 502,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Erreur de communication avec le backend Render',
        message: error.message,
        stack: error.stack,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      })
    };
  }
};
