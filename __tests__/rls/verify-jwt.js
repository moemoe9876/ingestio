// This script verifies the JWT token format and auth.uid() value
import dotenv from 'dotenv';
import { createSupabaseClient, USER_A } from './utils.js';

dotenv.config();

async function verifyJwtAndAuthUid() {
  console.log('Verifying JWT token and auth.uid() for user:', USER_A.id);

  try {
    // Create client with authenticated user
    const client = createSupabaseClient({
      role: 'authenticated',
      userId: USER_A.id,
      email: USER_A.email
    });

    // Get auth.uid from database
    console.log('Fetching auth.uid() from database...');
    const { data, error } = await client.rpc('get_my_auth_uid');
    
    console.log('Auth UID Result:', { data, error });

    if (error) {
      console.error('Error getting auth.uid():', error);
      return;
    }

    // Check if they match
    console.log('Expected User ID:', USER_A.id);
    console.log('Actual auth.uid():', data);
    console.log('Do they match?', USER_A.id === data);

    // Test storage function too
    console.log('\nTesting storage.foldername function...');
    const testPath = `${USER_A.id}/test.pdf`;
    
    const { data: folderData, error: folderError } = await client.rpc('test_storage_foldername', { 
      path: testPath 
    });
    
    console.log('storage.foldername Result:', { folderData, folderError });
    
    if (folderError) {
      console.error('Error testing storage.foldername:', folderError);
      return;
    }
    
    console.log('First folder segment:', folderData);
    console.log('Matches user ID?', USER_A.id === folderData);

    // Test storage RLS check
    console.log('\nTesting RLS policy evaluation directly...');
    const { data: rlsData, error: rlsError } = await client.rpc('debug_storage_rls_check', {
      user_id: USER_A.id,
      path: testPath
    });
    
    console.log('RLS Check Result:', { rlsData, rlsError });
    
    if (rlsError) {
      console.error('Error in RLS check:', rlsError);
      return;
    }
    
    console.log('RLS policy would allow access?', rlsData);

  } catch (error) {
    console.error('Script error:', error);
  }
}

verifyJwtAndAuthUid(); 