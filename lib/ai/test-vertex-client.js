/**
 * This is a standalone test script to validate Vertex AI API access
 * Run with: node lib/ai/test-vertex-client.js
 */

// Import necessary libraries
const { GoogleAuth } = require('google-auth-library');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function main() {
  try {
    console.log('Vertex AI API Test');
    console.log('==================');
    
    // 1. Verify credentials and environment
    const projectId = process.env.GOOGLE_VERTEX_PROJECT;
    const location = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1';
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    console.log(`Project ID: ${projectId || 'NOT SET'}`);
    console.log(`Location: ${location}`);
    console.log(`Credentials Path: ${credentialsPath || 'NOT SET'}`);
    
    if (!projectId) {
      throw new Error('GOOGLE_VERTEX_PROJECT is not set');
    }
    
    // 2. Create authentication client
    console.log('\nAuthentication Test:');
    console.log('------------------');
    
    let auth;
    let credentials;
    
    if (credentialsPath && fs.existsSync(credentialsPath)) {
      console.log(`Reading credentials from file: ${credentialsPath}`);
      const rawCredentials = fs.readFileSync(credentialsPath, 'utf8');
      credentials = JSON.parse(rawCredentials);
      
      console.log(`Service Account: ${credentials.client_email}`);
      console.log(`Project from credentials: ${credentials.project_id}`);
      
      auth = new GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
    } else {
      console.log('No valid credentials path found.');
      console.log('Trying Application Default Credentials...');
      
      auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
    }
    
    // Get an access token
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    
    if (token && token.token) {
      const maskedToken = token.token.substring(0, 10) + '...' + token.token.substring(token.token.length - 5);
      console.log(`✅ Successfully obtained access token: ${maskedToken}`);
    } else {
      throw new Error('Failed to obtain access token');
    }
    
    // 3. Make a direct request to Vertex AI using the token
    console.log('\nVertex AI API Test:');
    console.log('------------------');
    
    // Test with a simple model listing call first
    console.log('Listing available models...');
    
    const modelsUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/models`;
    
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to list models: ${response.status} ${response.statusText}\n${errorText}`);
    }
    
    const models = await response.json();
    console.log(`✅ Successfully listed models. Found ${models.models?.length || 0} models`);
    
    // 4. Test connection to Supabase
    console.log('\nSupabase Connection Test:');
    console.log('------------------------');
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase URL or key not set');
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data, error } = await supabase.from('documents').select('id').limit(1);
      
      if (error) {
        console.log('❌ Supabase query error:', error.message);
      } else {
        console.log(`✅ Successfully connected to Supabase. Found ${data.length} documents`);
      }
    }
    
    console.log('\nTest Complete ✅');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

main().catch(console.error); 