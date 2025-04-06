// Apply RLS policies to the users table
const fs = require('fs');
const { config } = require('dotenv');
const postgres = require('postgres');

// Load environment variables from .env.local
config({ path: '.env.local' });

async function main() {
  // Create a postgres client with the DB URL from your environment
  const sql = postgres(process.env.DATABASE_URL);

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('./db/migrations/0002_setup_users_rls.sql', 'utf8');
    
    // Split the SQL file by semicolons to execute each statement separately
    const statements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await sql.unsafe(statement);
    }
    
    console.log('All statements executed successfully!');
  } catch (error) {
    console.error('Error executing SQL:', error);
  } finally {
    // Close the connection
    await sql.end();
  }
}

main().catch(console.error); 