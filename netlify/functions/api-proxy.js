// Netlify Function to proxy API requests to Render
const https = require('https');
const url = require('url');

exports.handler = async function(event, context) {
  // Extract path and parameters from the incoming request
  const { path } = event;
  const { queryStringParameters, headers, body, httpMethod } = event;
  
  // Target Render backend
  const RENDER_API_URL = 'https://onerunmillion.onrender.com';
  
  // Construct the target URL (remove /api-proxy from path)
  const targetPath = path.replace(/^\/api-proxy/, '');
  const parsedUrl = new URL(`${RENDER_API_URL}${targetPath}`);
  
  // Add query parameters
  if (queryStringParameters) {
    Object.keys(queryStringParameters).forEach(key => {
      parsedUrl.searchParams.append(key, queryStringParameters[key]);
    });
  }
  
  // Create request options
  const options = {
    method: httpMethod,
    headers: {
      ...headers,
      host: parsedUrl.host,
    },
  };
  
  // Remove headers that cause issues
  delete options.headers.host;
  delete options.headers['x-forwarded-host'];
  delete options.headers['x-forwarded-proto'];
  
  // Return a promise to make the HTTP request
  return new Promise((resolve, reject) => {
    const req = https.request(parsedUrl, options, (res) => {
      let responseBody = '';
      
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      
      res.on('end', () => {
        // Prepare headers for the response
        let responseHeaders = {};
        Object.keys(res.headers).forEach(key => {
          responseHeaders[key] = res.headers[key];
        });
        
        // Add CORS headers
        responseHeaders['Access-Control-Allow-Origin'] = '*';
        responseHeaders['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
        responseHeaders['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
        
        resolve({
          statusCode: res.statusCode,
          headers: responseHeaders,
          body: responseBody
        });
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making request to API:', error);
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to reach API' })
      });
    });
    
    // Send request body if it exists
    if (body && (httpMethod === 'POST' || httpMethod === 'PUT')) {
      req.write(body);
    }
    
    req.end();
  });
};
