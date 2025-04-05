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
    
    try {
      // Insert user into Supabase profiles table
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: id,
          membership: 'free', // Default to free tier
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();
      
      if (error) {
        console.error('Error creating user in Supabase:', error);
        return new Response('Error creating user in Supabase', { status: 500 });
      }
      
      console.log('User created in Supabase:', id);
      return new Response('User created in Supabase', { status: 200 });
    } catch (error) {
      console.error('Error syncing user data to Supabase:', error);
      return new Response('Error syncing user data to Supabase', { status: 500 });
    }
  }
  
  if (eventType === 'user.updated') {
    const { id } = evt.data;
    
    try {
      // Check if the user exists in the profiles table
      const { data: existingUser, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is the error code for "no rows found"
        console.error('Error fetching user from Supabase:', fetchError);
        return new Response('Error fetching user from Supabase', { status: 500 });
      }
      
      if (!existingUser) {
        // If user doesn't exist in Supabase, create it (migration case)
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: id,
            membership: 'free', // Default to free tier
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        
        if (insertError) {
          console.error('Error creating user in Supabase during update:', insertError);
          return new Response('Error creating user in Supabase during update', { status: 500 });
        }
      } else {
        // User exists, update the updated_at timestamp
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', id);
        
        if (updateError) {
          console.error('Error updating user in Supabase:', updateError);
          return new Response('Error updating user in Supabase', { status: 500 });
        }
      }
      
      console.log('User updated in Supabase:', id);
      return new Response('User updated in Supabase', { status: 200 });
    } catch (error) {
      console.error('Error syncing user update to Supabase:', error);
      return new Response('Error syncing user update to Supabase', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    
    try {
      // Delete user from Supabase profiles table
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', id);
      
      if (error) {
        console.error('Error deleting user from Supabase:', error);
        return new Response('Error deleting user from Supabase', { status: 500 });
      }
      
      console.log('User deleted from Supabase:', id);
      return new Response('User deleted from Supabase', { status: 200 });
    } catch (error) {
      console.error('Error deleting user from Supabase:', error);
      return new Response('Error deleting user from Supabase', { status: 500 });
    }
  }

  return new Response('Webhook received', { status: 200 });
} 

