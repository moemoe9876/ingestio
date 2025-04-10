// Script to create test data for RLS tests
// Run with: node __tests__/rls/setup-test-data.js

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

// Test users from utils.ts
const USER_A = {
  id: "user_123",
  email: "user_a@test.com",
};

const USER_B = {
  id: "user_456",
  email: "user_b@test.com",
};

async function setupTestData() {
  console.log("Setting up test data for RLS tests...");
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables. Please check your .env file.");
    process.exit(1);
  }

  // Create service client
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Create or update test users
  console.log("Creating test users...");
  
  for (const user of [USER_A, USER_B]) {
    // Check if user exists
    const { data: existingUser } = await serviceClient
      .from("users")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (existingUser) {
      console.log(`User ${user.id} already exists, updating...`);
      const { error: updateError } = await serviceClient
        .from("users")
        .update({
          email: user.email,
        })
        .eq("user_id", user.id);
      
      if (updateError) {
        console.error(`Error updating user ${user.id}:`, updateError);
      }
    } else {
      console.log(`Creating new user ${user.id}...`);
      const { error: insertError } = await serviceClient
        .from("users")
        .insert({
          user_id: user.id,
          email: user.email,
        });
      
      if (insertError) {
        console.error(`Error creating user ${user.id}:`, insertError);
      }
    }
  }

  // 2. Create or update profiles
  console.log("Creating profiles...");
  
  for (const user of [USER_A, USER_B]) {
    // Check if profile exists
    const { data: existingProfile } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (existingProfile) {
      console.log(`Profile for ${user.id} already exists, no update needed`);
    } else {
      console.log(`Creating new profile for ${user.id}...`);
      const { error: insertError } = await serviceClient
        .from("profiles")
        .insert({
          user_id: user.id,
        });
      
      if (insertError) {
        console.error(`Error creating profile for ${user.id}:`, insertError);
      }
    }
  }

  // 3. Create test user_usage records
  console.log("Creating user_usage records...");
  
  for (const user of [USER_A, USER_B]) {
    // Check if usage exists
    const { data: existingUsage } = await serviceClient
      .from("user_usage")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    // Calculate billing periods
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
    
    if (existingUsage) {
      console.log(`Usage for ${user.id} already exists, updating...`);
      const { error: updateError } = await serviceClient
        .from("user_usage")
        .update({
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          pages_limit: 100 // Based on error message
        })
        .eq("user_id", user.id);
      
      if (updateError) {
        console.error(`Error updating usage for ${user.id}:`, updateError);
      }
    } else {
      console.log(`Creating new usage for ${user.id}...`);
      const { error: insertError } = await serviceClient
        .from("user_usage")
        .insert({
          user_id: user.id,
          billing_period_start: billingPeriodStart,
          billing_period_end: billingPeriodEnd,
          pages_limit: 100 // Based on error message
        });
      
      if (insertError) {
        console.error(`Error creating usage for ${user.id}:`, insertError);
      }
    }
  }

  // 4. Create test documents
  console.log("Creating test documents...");
  
  // First, clean up existing test documents to avoid accumulation
  console.log("Cleaning up existing test documents...");
  const { error: deleteError } = await serviceClient
    .from("documents")
    .delete()
    .in("user_id", [USER_A.id, USER_B.id]);
  
  if (deleteError) {
    console.error("Error cleaning up test documents:", deleteError);
  }
  
  // Possible status values based on error messages
  const possibleStatuses = ["pending", "complete", "failed", "ingested", "error"];
  
  // Let's inspect the documents table schema
  console.log("Inspecting documents table schema...");
  try {
    const { data: docSample, error: schemaError } = await serviceClient
      .from("documents")
      .select("*")
      .limit(1);
    
    if (schemaError) {
      console.error("Error fetching documents schema:", schemaError);
    } else {
      const sampleDoc = docSample[0];
      if (sampleDoc) {
        console.log("Documents table columns:", Object.keys(sampleDoc).join(", "));
      } else {
        console.log("No sample document found to inspect schema");
      }
    }
  } catch (err) {
    console.error("Error examining documents schema:", err);
  }

  // Create two documents for each user
  for (const user of [USER_A, USER_B]) {
    for (let i = 1; i <= 2; i++) {
      // Try each possible status until one works
      for (const status of possibleStatuses) {
        console.log(`Trying to create document ${i} for ${user.id} with status "${status}"...`);
        
        // Create a document with only the most essential fields
        const docData = {
          user_id: user.id,
          status: status,
          original_filename: `test_doc_${i}.pdf`
        };
        
        // Add other fields if needed based on inspection results
        
        const { error: insertError } = await serviceClient
          .from("documents")
          .insert(docData);
        
        if (insertError) {
          if (insertError.message.includes("invalid input value for enum")) {
            console.log(`Status "${status}" is not valid, trying next value...`);
            continue; // Try the next status
          } else if (insertError.message.includes("column") && insertError.message.includes("does not exist")) {
            // If a column doesn't exist, remove it from our data
            const badFieldMatch = insertError.message.match(/column "([^"]+)" does not exist/);
            if (badFieldMatch && badFieldMatch[1]) {
              console.log(`Removing non-existent field: ${badFieldMatch[1]}`);
              delete docData[badFieldMatch[1]];
              continue; // Try again with the field removed
            }
          } else if (insertError.message.includes("violates not-null constraint")) {
            // If we're missing a required field, try to extract which one
            const missingFieldMatch = insertError.message.match(/column "([^"]+)" of relation "documents" violates not-null constraint/);
            if (missingFieldMatch && missingFieldMatch[1]) {
              const missingField = missingFieldMatch[1];
              console.log(`Adding required field: ${missingField}`);
              
              // Add a default value based on the field name
              if (missingField === 'page_count') {
                docData[missingField] = 5;
              } else if (missingField === 'file_size') {
                docData[missingField] = 1024;
              } else {
                docData[missingField] = `test_value_for_${missingField}`;
              }
              
              continue; // Try again with the added field
            }
          } else {
            console.error(`Error creating document ${i} for ${user.id}:`, insertError);
          }
        } else {
          console.log(`✅ Successfully created document with status "${status}"`);
          break; // Exit the loop if successful
        }
      }
    }
  }

  console.log("Test data setup complete!");
  console.log("Now please try running the RLS tests again.");
}

setupTestData().catch(err => {
  console.error("Test data setup failed:", err);
  process.exit(1);
}); 