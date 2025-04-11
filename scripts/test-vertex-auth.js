/**
 * This script tests the authentication to Vertex AI
 * Run with: node scripts/test-vertex-auth.js
 */

const fs = require('fs');
const { GoogleAuth } = require('google-auth-library');
const { VertexAI } = require('@google-cloud/vertexai');

// Read environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

async function testVertexAuth() {
  console.log('Starting Vertex AI authentication test...');
  
  // Get project details
  const projectId = process.env.GOOGLE_VERTEX_PROJECT || process.env.VERTEX_PROJECT;
  const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';
  
  if (!projectId) {
    console.error('Project ID not found. Please set GOOGLE_VERTEX_PROJECT in .env.local');
    process.exit(1);
  }
  
  console.log(`Using project: ${projectId}`);
  console.log(`Using location: ${location}`);
  
  try {
    // First, try using GOOGLE_APPLICATION_CREDENTIALS
    let authMethod = 'GOOGLE_APPLICATION_CREDENTIALS';
    let auth;
    
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log(`Found GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (fs.existsSync(credPath)) {
        console.log('Credentials file exists');
        
        try {
          // Read the file to display some info (safely)
          const credContent = JSON.parse(fs.readFileSync(credPath, 'utf8'));
          console.log(`Service account: ${credContent.client_email}`);
          console.log(`Project from credentials: ${credContent.project_id}`);
        } catch (e) {
          console.error('Could not parse credentials file:', e.message);
        }
      } else {
        console.error('Credentials file does not exist:', credPath);
      }
      
      // Create auth client using the path
      auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform'
      });
    } 
    // Next, try GOOGLE_CREDENTIALS
    else if (process.env.GOOGLE_CREDENTIALS) {
      authMethod = 'GOOGLE_CREDENTIALS';
      console.log('Found GOOGLE_CREDENTIALS environment variable');
      
      try {
        // Parse credentials from environment variable
        const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        console.log(`Service account: ${credentials.client_email}`);
        console.log(`Project from credentials: ${credentials.project_id}`);
        
        // Create auth client using the credentials object
        auth = new GoogleAuth({
          credentials,
          scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
      } catch (e) {
        console.error('Could not parse GOOGLE_CREDENTIALS:', e.message);
        process.exit(1);
      }
    } else {
      authMethod = 'DEFAULT_CREDENTIALS';
      console.log('No explicit credentials found, trying Application Default Credentials');
      
      // Try to use Application Default Credentials
      auth = new GoogleAuth({
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
        projectId
      });
    }
    
    // Get a token to validate authentication
    console.log(`Getting access token using ${authMethod}...`);
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    if (token && token.token) {
      // Mask most of the token for security
      const maskedToken = `${token.token.substring(0, 10)}...${token.token.substring(token.token.length - 5)}`;
      console.log(`✅ Successfully authenticated! Token: ${maskedToken}`);
      
      // Test Vertex AI access
      console.log('\nTesting Vertex AI API access...');
      
      // Initialize Vertex AI
      const vertexAI = new VertexAI({
        project: projectId,
        location
      });
      
      // List available models (a simple API call to test access)
      console.log('Listing available Gemini models...');
      const publisherModel = vertexAI.preview.getGenerativeModel({
        model: 'gemini-1.0-pro'
      });
      
      // Simple API call to test model access
      const result = await publisherModel.countTokens('Hello, world!');
      console.log('Token count result:', result);
      
      console.log('✅ Successfully accessed Vertex AI API!');
    } else {
      console.error('❌ Failed to get valid access token');
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testVertexAuth().catch(console.error); 