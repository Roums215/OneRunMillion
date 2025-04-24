// Netlify Serverless Function pour contourner les problèmes CORS
const axios = require('axios');

exports.handler = async function(event) {
  // Configuration de base pour cette fonction
  const RENDER_API_URL = 'https://onerunmillion.onrender.com';

  try {
    // Extraire les informations de la requête
    const path = event.path.replace('/.netlify/functions/cors-proxy', '');
    const targetUrl = `${RENDER_API_URL}${path}`;
    const method = event.httpMethod;
    const headers = event.headers;
    const queryParams = event.queryStringParameters || {};
    const body = event.body;

    console.log(`Proxy request: ${method} ${targetUrl}`);

    // Configuration de la requête vers le backend Render
    const requestConfig = {
      method: method,
      url: targetUrl,
      params: queryParams,
      headers: {
        // Transmettre les headers pertinents
        'Content-Type': headers['content-type'] || 'application/json',
        'Authorization': headers['authorization']
      },
      data: method !== 'GET' && method !== 'HEAD' ? body : undefined,
      validateStatus: () => true // Ne pas rejeter les réponses avec des codes d'erreur HTTP
    };

    // Faire la requête au backend
    const response = await axios(requestConfig);

    console.log(`Proxy response: ${response.status} for ${targetUrl}`);

    // Retourner la réponse avec les CORS headers
    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': response.headers['content-type'] || 'application/json'
      },
      body: typeof response.data === 'object' ? JSON.stringify(response.data) : response.data
    };
  } catch (error) {
    console.log('Proxy error:', error);
    
    // Gérer les erreurs avec une réponse appropriée
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: 'Une erreur est survenue lors de la requête',
        details: error.message
      })
    };
  }
};
