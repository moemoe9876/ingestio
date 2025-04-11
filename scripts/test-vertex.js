const jwt = require('jsonwebtoken');
const fs = require('fs');
const https = require('https');

// Read service account key
const serviceAccount = require('./service-account.json');

// Log service account information
console.log('Service Account Information:');
console.log('- Project ID:', serviceAccount.project_id);
console.log('- Client Email:', serviceAccount.client_email);
console.log('- Token URI:', serviceAccount.token_uri);

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
      
      // Check if Vertex AI API is enabled
      console.log('\nChecking API enablement status:');
      const apiRequest = https.request(
        `https://serviceusage.googleapis.com/v1/projects/${serviceAccount.project_id}/services/aiplatform.googleapis.com`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        },
        (res) => {
          console.log('API Check Status:', res.statusCode);
          let apiData = '';
          res.on('data', chunk => apiData += chunk);
          res.on('end', () => {
            console.log('API Status Data:', apiData);
            
            // Check service account permissions
            console.log('\nChecking service account IAM permissions:');
            const iamRequest = https.request(
              `https://cloudresourcemanager.googleapis.com/v1/projects/${serviceAccount.project_id}:testIamPermissions`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${access_token}`,
                  'Content-Type': 'application/json'
                }
              },
              (res) => {
                console.log('IAM Check Status:', res.statusCode);
                let iamData = '';
                res.on('data', chunk => iamData += chunk);
                res.on('end', () => {
                  console.log('IAM Permissions Data:', iamData);
                  
                  // Test the actual model endpoint
                  console.log('\nTesting model endpoint:');
                  const PROJECT_ID = serviceAccount.project_id;
                  const LOCATION = "us-central1";
                  const MODEL_ID = "gemini-2.0-flash-001";
                  
                  const modelRequest = https.request(
                    `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:streamGenerateContent`,
                    {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${access_token}`,
                        'Content-Type': 'application/json'
                      }
                    },
                    (res) => {
                      console.log('Model API Status:', res.statusCode);
                      console.log('Response Headers:', JSON.stringify(res.headers, null, 2));
                      
                      let modelData = '';
                      res.on('data', chunk => modelData += chunk);
                      res.on('end', () => {
                        console.log('Model API Response:', modelData);
                        
                        // Parse and analyze the error if applicable
                        try {
                          const errorData = JSON.parse(modelData);
                          if (errorData.error) {
                            console.log('\nDetailed Error Analysis:');
                            console.log('- Error Code:', errorData.error.code);
                            console.log('- Error Message:', errorData.error.message);
                            console.log('- Error Status:', errorData.error.status);
                            
                            if (errorData.error.details) {
                              console.log('- Error Details:');
                              errorData.error.details.forEach((detail, i) => {
                                console.log(`  Detail ${i+1}:`, JSON.stringify(detail, null, 2));
                              });
                            }
                            
                            // Provide specific guidance based on error
                            if (errorData.error.message.includes('aiplatform.endpoints.predict')) {
                              console.log('\nRECOMMENDATION: Add "Vertex AI User" AND "Vertex AI Client" roles to your service account');
                            } else if (errorData.error.message.includes('not exist')) {
                              console.log('\nRECOMMENDATION: Verify the model ID, project ID, and location are correct');
                            } else if (errorData.error.code === 403) {
                              console.log('\nRECOMMENDATION: Check if the Vertex AI API is enabled and the project has billing enabled');
                            }
                          }
                        } catch (e) {
                          console.log('Error parsing response:', e.message);
                        }
                      });
                    }
                  );
                  
                  modelRequest.on('error', (error) => {
                    console.error('Error with model API call:', error);
                  });
                  
                  modelRequest.write(JSON.stringify({
                    contents: [{
                      role: "user",
                      parts: [
                        { text: "Why is the sky blue?" }
                      ]
                    }]
                  }));
                  
                  modelRequest.end();
                });
              }
            );
            
            iamRequest.on('error', (error) => {
              console.error('Error checking IAM permissions:', error);
            });
            
            iamRequest.write(JSON.stringify({
              permissions: [
                "aiplatform.endpoints.predict",
                "aiplatform.models.predict"
              ]
            }));
            
            iamRequest.end();
          });
        }
      );
      
      apiRequest.on('error', (error) => {
        console.error('Error checking API status:', error);
      });
      
      apiRequest.end();
    });
  }
);

tokenRequest.on('error', (error) => {
  console.error('Error getting token:', error);
});

tokenRequest.write(`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`);
tokenRequest.end(); 