// Script to fix membership values in the database
// Run with: node scripts/fix-memberships.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client with admin privileges
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  try {
    console.log('Checking current profiles and membership values...');
    
    // Get all profiles
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('user_id, membership')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching profiles:', fetchError);
      return;
    }
    
    console.log(`Found ${profiles.length} profiles:`);
    const membershipCounts = {};
    
    // Log each profile and count membership types
    profiles.forEach((profile, index) => {
      console.log(`${index + 1}. User ${profile.user_id}: membership = "${profile.membership}"`);
      
      membershipCounts[profile.membership] = 
        (membershipCounts[profile.membership] || 0) + 1;
    });
    
    console.log('\nMembership counts:');
    Object.entries(membershipCounts).forEach(([membership, count]) => {
      console.log(`- ${membership}: ${count} users`);
    });
    
    // Ask for confirmation before updating
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('\nDo you want to update all "free" memberships to "starter"? (yes/no): ', async (answer) => {
      if (answer.toLowerCase() === 'yes') {
        // Update all 'free' memberships to 'starter'
        const { data: updateData, error: updateError } = await supabase.rpc(
          'admin_update_memberships',
          { old_membership: 'free', new_membership: 'starter' }
        );
        
        if (updateError) {
          console.error('Error updating memberships. You may need to create the admin_update_memberships function:', updateError);
          console.log('\nAlternative direct SQL statement (run in Supabase SQL editor):');
          console.log(`UPDATE profiles SET membership = 'starter' WHERE membership = 'free';`);
        } else {
          console.log('Memberships updated successfully!');
          console.log(`Updated ${updateData || 0} profiles.`);
        }
      } else {
        console.log('Update cancelled.');
      }
      
      readline.close();
    });
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

main(); 