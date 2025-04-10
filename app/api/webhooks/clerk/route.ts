import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { createClerkAdminClient } from './clerk-client';

export async function POST(req: Request) {
  // Get the webhook signature from the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  // Get Supabase admin client 
  const supabase = createClerkAdminClient();
  
  // Handle the webhook event
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, image_url, first_name, last_name, created_at } = evt.data;
    
    const primaryEmail = email_addresses?.[0]?.email_address;
    
    if (!primaryEmail) {
      return new Response('No email address found', { status: 400 });
    }
    
    // Combine first and last name if available
    const fullName = [first_name, last_name].filter(Boolean).join(' ') || null;
    
    try {
      // Start a transaction to ensure both tables are updated consistently
      // Since we're using the Supabase REST API, we'll have to simulate a transaction
      // with multiple requests and handle errors manually
      
      // 1. First, insert into the users table (identity information)
      const { error: userError } = await supabase
        .from('users')
        .insert({
          user_id: id,
          email: primaryEmail,
          full_name: fullName,
          avatar_url: image_url || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (userError) {
        console.error('Error creating user in users table:', userError);
        return new Response('Error creating user in users table', { status: 500 });
      }
      
      // 2. Then, insert into the profiles table (subscription/membership info)
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          user_id: id,
          membership: 'starter', // Default to starter tier (was 'free')
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      
      if (profileError) {
        // If profile creation fails, attempt to clean up the user record to maintain consistency
        await supabase.from('users').delete().eq('user_id', id);
        console.error('Error creating profile in profiles table:', profileError);
        return new Response('Error creating profile in profiles table', { status: 500 });
      }
      
      console.log('User and profile created in Supabase:', id);
      return new Response('User and profile created in Supabase', { status: 200 });
    } catch (error) {
      console.error('Error syncing user data to Supabase:', error);
      return new Response('Error syncing user data to Supabase', { status: 500 });
    }
  }
  
  if (eventType === 'user.updated') {
    const { id, email_addresses, image_url, first_name, last_name } = evt.data;
    
    const primaryEmail = email_addresses?.[0]?.email_address;
    // Combine first and last name if available
    const fullName = [first_name, last_name].filter(Boolean).join(' ') || null;
    
    try {
      // 1. Check if the user exists in the users table
      const { data: existingUser, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', id)
        .single();
      
      // 2. Check if the profile exists in the profiles table
      const { data: existingProfile, error: profileFetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();
      
      // If neither exists, this is an unusual situation - create both
      if (!existingUser && !existingProfile) {
        // Create user record
        if (primaryEmail) {
          await supabase
            .from('users')
            .insert({
              user_id: id,
              email: primaryEmail,
              full_name: fullName,
              avatar_url: image_url || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
        
        // Create profile record
        await supabase
          .from('profiles')
          .insert({
            user_id: id,
            membership: 'starter', // Default to starter tier (was 'free')
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          
        console.log('Created missing user and profile records during update:', id);
      } else {
        // Update operations
        
        // Update user record if it exists
        if (existingUser) {
          const userUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
          
          if (primaryEmail) userUpdates.email = primaryEmail;
          if (fullName !== undefined) userUpdates.full_name = fullName;
          if (image_url !== undefined) userUpdates.avatar_url = image_url;
          
          const { error: userUpdateError } = await supabase
            .from('users')
            .update(userUpdates)
            .eq('user_id', id);
            
          if (userUpdateError) {
            console.error('Error updating user in users table:', userUpdateError);
          }
        } else if (primaryEmail) {
          // User doesn't exist but profile does - create user
          await supabase
            .from('users')
            .insert({
              user_id: id,
              email: primaryEmail,
              full_name: fullName,
              avatar_url: image_url || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
        
        // Update profile record if it exists
        if (existingProfile) {
          const { error: profileUpdateError } = await supabase
            .from('profiles')
            .update({
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', id);
            
          if (profileUpdateError) {
            console.error('Error updating profile in profiles table:', profileUpdateError);
          }
        } else {
          // Profile doesn't exist but user does - create profile
          await supabase
            .from('profiles')
            .insert({
              user_id: id,
              membership: 'starter', // Default to starter tier (was 'free')
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
      }
      
      console.log('User and/or profile updated in Supabase:', id);
      return new Response('User and/or profile updated in Supabase', { status: 200 });
    } catch (error) {
      console.error('Error syncing user update to Supabase:', error);
      return new Response('Error syncing user update to Supabase', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    
    try {
      // Delete user from both tables - order matters to maintain referential integrity
      // If there were foreign key constraints, we'd delete profiles first
      
      // Ensure id is defined before proceeding
      if (!id) {
        return new Response('Missing user ID in delete webhook', { status: 400 });
      }
      
      // 1. Delete from profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', id);
      
      if (profileError) {
        console.error('Error deleting profile from Supabase:', profileError);
        // Continue with user deletion even if profile deletion fails
      }
      
      // 2. Delete from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('user_id', id);
      
      if (userError) {
        console.error('Error deleting user from Supabase:', userError);
        return new Response('Error deleting user from Supabase', { status: 500 });
      }
      
      console.log('User and profile deleted from Supabase:', id);
      return new Response('User and profile deleted from Supabase', { status: 200 });
    } catch (error) {
      console.error('Error deleting user from Supabase:', error);
      return new Response('Error deleting user from Supabase', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
} 

