const jwt = require('jsonwebtoken');
const https = require('https');

// Read service account key
const serviceAccount = require('../service-account.json');

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
      console.log('Got access token:', access_token ? 'Yes' : 'No');
      
      // 1. First check predefined roles (no parent parameter)
      const predefinedRolesRequest = https.request(
        `https://iam.googleapis.com/v1/roles?view=FULL`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json'
          }
        },
        (res) => {
          console.log('Predefined Roles API Status:', res.statusCode);
          
          let rolesData = '';
          res.on('data', chunk => rolesData += chunk);
          res.on('end', () => {
            try {
              const rolesResponse = JSON.parse(rolesData);
              
              // Check for success or error
              if (rolesResponse.error) {
                console.log('Error checking predefined roles:', rolesResponse.error.message);
              } else {
                // Filter for Vertex AI related roles
                const aiRoles = (rolesResponse.roles || []).filter(role => 
                  role.name && (
                    role.name.toLowerCase().includes('aiplatform') ||
                    (role.description && role.description.toLowerCase().includes('vertex ai'))
                  )
                );
                
                console.log('\nVertex AI related predefined roles:');
                aiRoles.forEach(role => {
                  console.log(`- ${role.name}: ${role.description || 'No description'}`);
                  
                  // Check if this role includes the permission we need
                  if (role.includedPermissions && 
                      role.includedPermissions.includes('aiplatform.endpoints.predict')) {
                    console.log(`  ✓ This role INCLUDES the aiplatform.endpoints.predict permission`);
                  }
                });
                
                // Specifically check for the client role we suspect
                const clientRole = (rolesResponse.roles || []).find(role => 
                  role.name === 'roles/aiplatform.client'
                );
                
                if (clientRole) {
                  console.log('\nVertex AI Client Role:');
                  console.log(`- ${clientRole.name}: ${clientRole.description || 'No description'}`);
                  console.log('- Permissions:');
                  (clientRole.includedPermissions || []).forEach(perm => {
                    console.log(`  - ${perm}`);
                  });
                } else {
                  console.log('\nVertex AI Client Role not found in predefined roles');
                }
              }
              
              // 2. Then check project-specific roles
              const projectRolesRequest = https.request(
                `https://iam.googleapis.com/v1/projects/${serviceAccount.project_id}/roles`,
                {
                  method: 'GET',
                  headers: {
                    'Authorization': `Bearer ${access_token}`,
                    'Content-Type': 'application/json'
                  }
                },
                (res) => {
                  console.log('\nProject Roles API Status:', res.statusCode);
                  
                  let projectRolesData = '';
                  res.on('data', chunk => projectRolesData += chunk);
                  res.on('end', () => {
                    try {
                      const projectRolesResponse = JSON.parse(projectRolesData);
                      
                      if (projectRolesResponse.error) {
                        console.log('Error checking project roles:', projectRolesResponse.error.message);
                      } else {
                        console.log('Project-specific roles:');
                        (projectRolesResponse.roles || []).forEach(role => {
                          console.log(`- ${role.name}: ${role.description || 'No description'}`);
                          
                          // Check permissions in this role
                          if (role.includedPermissions && 
                              role.includedPermissions.includes('aiplatform.endpoints.predict')) {
                            console.log(`  ✓ This role INCLUDES the aiplatform.endpoints.predict permission`);
                          }
                        });
                      }
                      
                      // 3. Finally, check our service account's current permissions
                      console.log('\nChecking service account\'s current permissions...');
                      const testIamRequest = https.request(
                        `https://cloudresourcemanager.googleapis.com/v1/projects/${serviceAccount.project_id}:testIamPermissions`,
                        {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${access_token}`,
                            'Content-Type': 'application/json'
                          }
                        },
                        (res) => {
                          console.log('TestIam API Status:', res.statusCode);
                          
                          let testIamData = '';
                          res.on('data', chunk => testIamData += chunk);
                          res.on('end', () => {
                            try {
                              const testIamResponse = JSON.parse(testIamData);
                              
                              if (testIamResponse.error) {
                                console.log('Error checking permissions:', testIamResponse.error.message);
                              } else {
                                console.log('Service account permissions:');
                                console.log(testIamResponse);
                                
                                // Check if we have the specific permission we need
                                const hasPermission = testIamResponse.permissions && 
                                  testIamResponse.permissions.includes('aiplatform.endpoints.predict');
                                
                                console.log('\nHas aiplatform.endpoints.predict permission:', 
                                  hasPermission ? 'YES' : 'NO');
                              }
                            } catch (e) {
                              console.log('Error parsing TestIam response:', e.message);
                            }
                          });
                        }
                      );
                      
                      testIamRequest.on('error', (error) => {
                        console.error('Error with TestIam request:', error);
                      });
                      
                      testIamRequest.write(JSON.stringify({
                        permissions: [
                          'aiplatform.endpoints.predict',
                          'aiplatform.models.predict'
                        ]
                      }));
                      
                      testIamRequest.end();
                    } catch (e) {
                      console.log('Error parsing project roles response:', e.message);
                    }
                  });
                }
              );
              
              projectRolesRequest.on('error', (error) => {
                console.error('Error with project roles request:', error);
              });
              
              projectRolesRequest.end();
            } catch (e) {
              console.log('Error parsing predefined roles response:', e.message);
            }
          });
        }
      );
      
      predefinedRolesRequest.on('error', (error) => {
        console.error('Error with predefined roles request:', error);
      });
      
      predefinedRolesRequest.end();
    });
  }
);

tokenRequest.on('error', (error) => {
  console.error('Error getting token:', error);
});

tokenRequest.write(`grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`);
tokenRequest.end(); 