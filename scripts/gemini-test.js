const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');

// Read service account key
const serviceAccount = require('./service-account.json');

// Log service account information
console.log('Service Account Information:');
console.log('- Project ID:', serviceAccount.project_id);
console.log('- Client Email:', serviceAccount.client_email);

// Create JWT token
const now = Math.floor(Date.now() / 1000);
const token = jwt.sign({
  iss: serviceAccount.client_email,
  scope: 'https://www.googleapis.com/auth/cloud-platform',
  aud: serviceAccount.token_uri,
  exp: now + 3600,
  iat: now
}, serviceAccount.private_key, { algorithm: 'RS256' });

// Exchange JWT for access token
const tokenRequest = https.request(
  'https://oauth2.googleapis.com/token',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  },
  (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const { access_token } = JSON.parse(data);
      console.log('\nObtained Access Token:', access_token ? 'Success' : 'Failed');
      
      // After getting token, create a minimal request to Gemini
      const PROJECT_ID = serviceAccount.project_id;
      const LOCATION = "us-central1";
      
      // This API endpoint is different - let's try the publisher endpoint directly
      const MODEL_ID = "gemini-1.5-flash";
      
      console.log(`\nAttempting to connect to Gemini model: ${MODEL_ID}`);
      console.log(`Project: ${PROJECT_ID}, Location: ${LOCATION}`);
      
      // Let's try a slightly different endpoint format - sometimes the model name format matters
      const modelRequest = https.request(
        `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        },
        (res) => {
          console.log('Response Status:', res.statusCode);
          console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
          
          let responseData = '';
          res.on('data', chunk => responseData += chunk);
          res.on('end', () => {
            console.log('Response Body:', responseData);
            
            // Try to parse error information if applicable
            try {
              const responseJson = JSON.parse(responseData);
              if (responseJson.error) {
                console.log('\nError Analysis:');
                console.log('- Code:', responseJson.error.code);
                console.log('- Message:', responseJson.error.message);
                
                // Extract permission information if available
                if (responseJson.error.message.includes('Permission')) {
                  const permissionMatch = responseJson.error.message.match(/Permission '([^']+)'/);
                  if (permissionMatch && permissionMatch[1]) {
                    console.log('- Missing Permission:', permissionMatch[1]);
                  }
                }
                
                // Check if there are more details in the error
                if (responseJson.error.details) {
                  responseJson.error.details.forEach((detail, i) => {
                    console.log(`- Detail ${i+1}:`, JSON.stringify(detail, null, 2));
                    
                    // Check for metadata that might indicate the problem
                    if (detail.metadata) {
                      Object.entries(detail.metadata).forEach(([key, value]) => {
                        console.log(`  - ${key}: ${value}`);
                      });
                    }
                  });
                }
              }
            } catch (e) {
              console.log('Error parsing response:', e.message);
            }
          });
        }
      );
      
      modelRequest.on('error', (error) => {
        console.error('Error with request:', error);
      });
      
      // Try with a simpler model request payload for publisher models
      modelRequest.write(JSON.stringify({
        instances: [
          { prompt: "Why is the sky blue?" }
        ]
      }));
      
      modelRequest.end();
    });
  }
);

tokenRequest.on('error', (error) => {
  console.error('Error getting token:', error);
});

tokenRequest.write(`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`);
tokenRequest.end(); 