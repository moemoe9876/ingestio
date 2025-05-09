import { db } from '@/db/db';
import { processedClerkEventsTable } from '@/db/schema';
import { WebhookEvent } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { createClerkAdminClient } from './clerk-client';

export async function POST(req: Request) {
  // Get the webhook signature from the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return Response.json({ error: 'Missing svix headers' }, { status: 400 });
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
    return Response.json({ error: 'Error verifying webhook' }, { status: 400 });
  }

  // Check for previous processing (Idempotency Key Check)
  try {
    const [existingEvent] = await db
      .select({ eventId: processedClerkEventsTable.eventId })
      .from(processedClerkEventsTable)
      .where(eq(processedClerkEventsTable.eventId, svix_id))
      .limit(1);

    if (existingEvent) {
      console.log(`[Clerk Webhook] Event ${svix_id} already processed.`);
      return Response.json({ message: 'Webhook already processed' }, { status: 200 });
    }
  } catch (dbError) {
    console.error(`[Clerk Webhook] Error checking for existing event ${svix_id}:`, dbError);
    // Proceed with caution, or return an error if this check is critical
    // For now, we'll log and proceed. If the DB is down, processing might fail later anyway.
  }

  // Get Supabase admin client 
  const supabase = createClerkAdminClient();
  
  // Handle the webhook event
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, image_url, first_name, last_name, created_at } = evt.data;
    
    const primaryEmail = email_addresses?.[0]?.email_address;
    
    if (!primaryEmail) {
      console.error('[Clerk Webhook] User created event for ID:', id, 'missing primary email.');
      return Response.json({ error: 'No email address found' }, { status: 400 });
    }
    
    const fullName = [first_name, last_name].filter(Boolean).join(' ') || null;
    const userCreatedAt = created_at ? new Date(created_at) : new Date(); // Use Clerk's created_at if available

    try {
      console.log(`[Clerk Webhook] Processing user.created for ID: ${id}, Email: ${primaryEmail}, svix_id: ${svix_id}`);
      
      // 1. Insert into the users table
      const { error: userInsertError } = await supabase
        .from('users')
        .insert({
          user_id: id,
          email: primaryEmail,
          full_name: fullName,
          avatar_url: image_url || null,
          created_at: userCreatedAt.toISOString(), // Use consistent ISOString
          updated_at: new Date().toISOString(),    // Use consistent ISOString
        });
      
      if (userInsertError) {
        console.error(`[Clerk Webhook] Error inserting into users table for ID: ${id}:`, userInsertError);
        return Response.json({ error: 'Error creating user in users table' }, { status: 500 });
      }
      console.log(`[Clerk Webhook] Successfully inserted into users table for ID: ${id}`);

      // Verify user creation before proceeding to profile
      const { data: insertedUser, error: userFetchError } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', id)
        .single();

      if (userFetchError || !insertedUser) {
        console.error(`[Clerk Webhook] Failed to verify user in users table after insert for ID: ${id}:`, userFetchError);
        // Attempt to clean up if verification fails, though the user might not have been inserted.
        // This delete operation might fail if the user_id doesn't exist, which is fine.
        await supabase.from('users').delete().eq('user_id', id); 
        return Response.json({ error: 'Failed to confirm user creation in users table' }, { status: 500 });
      }
      console.log(`[Clerk Webhook] Successfully verified user in users table for ID: ${id}`);
      
      // 2. Then, insert into the profiles table
      const { error: profileInsertError } = await supabase
        .from('profiles')
        .insert({
          user_id: id, // This should now reliably exist
          membership: 'starter',
          created_at: new Date().toISOString(), // Use consistent ISOString
          updated_at: new Date().toISOString(),    // Use consistent ISOString
        });
      
      if (profileInsertError) {
        console.error(`[Clerk Webhook] Error inserting into profiles table for ID: ${id}:`, profileInsertError);
        // If profile creation fails, attempt to clean up the user record to maintain consistency.
        await supabase.from('users').delete().eq('user_id', id);
        return Response.json({ error: 'Error creating profile in profiles table' }, { status: 500 });
      }
      console.log(`[Clerk Webhook] Successfully inserted into profiles table for ID: ${id}`);
      
      // Mark as processed before returning success
      try {
        await db.insert(processedClerkEventsTable).values({ eventId: svix_id });
        console.log(`[Clerk Webhook] Marked event ${svix_id} (user.created) as processed.`);
      } catch (logError) {
        console.error(`[Clerk Webhook] Failed to mark event ${svix_id} as processed:`, logError);
      }
      console.log(`[Clerk Webhook] User and profile created successfully in Supabase for ID: ${id}`);
      return Response.json({ message: 'User and profile created in Supabase' }, { status: 200 });
    } catch (error) {
      console.error(`[Clerk Webhook] General error syncing user.created for ID: ${id}, svix_id: ${svix_id}:`, error);
      // Attempt a general cleanup if an unexpected error occurs.
      // This might not always succeed or be necessary if earlier specific cleanups ran.
      await supabase.from('profiles').delete().eq('user_id', id);
      await supabase.from('users').delete().eq('user_id', id);
      return Response.json({ error: 'Error syncing user data to Supabase' }, { status: 500 });
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
      
      // Mark as processed before returning success
      try {
        await db.insert(processedClerkEventsTable).values({ eventId: svix_id });
        console.log(`[Clerk Webhook] Marked event ${svix_id} (user.updated) as processed.`);
      } catch (logError) {
        console.error(`[Clerk Webhook] Failed to mark event ${svix_id} as processed:`, logError);
      }
      console.log('User and/or profile updated in Supabase:', id);
      return Response.json({ message: 'User and/or profile updated in Supabase' }, { status: 200 });
    } catch (error) {
      console.error(`[Clerk Webhook] Error syncing user.updated for ID: ${id}, svix_id: ${svix_id}:`, error);
      return Response.json({ error: 'Error syncing user update to Supabase' }, { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;
    
    try {
      // Delete user from both tables - order matters to maintain referential integrity
      // If there were foreign key constraints, we'd delete profiles first
      
      // Ensure id is defined before proceeding
      if (!id) {
        return Response.json({ error: 'Missing user ID in delete webhook' }, { status: 400 });
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
        return Response.json({ error: 'Error deleting user from Supabase' }, { status: 500 });
      }
      
      // Mark as processed before returning success
      if (id) {
        try {
          await db.insert(processedClerkEventsTable).values({ eventId: svix_id });
          console.log(`[Clerk Webhook] Marked event ${svix_id} (user.deleted) as processed.`);
        } catch (logError) {
          console.error(`[Clerk Webhook] Failed to mark event ${svix_id} as processed:`, logError);
        }
      }
      console.log('User and profile deleted from Supabase:', id);
      return Response.json({ message: 'User and profile deleted from Supabase' }, { status: 200 });
    } catch (error) {
      console.error(`[Clerk Webhook] Error deleting user for ID: ${id}, svix_id: ${svix_id}:`, error);
      return Response.json({ error: 'Error deleting user from Supabase' }, { status: 500 });
    }
  }

  // Fallback for unhandled event types or if no specific action taken
  // Do not mark these as processed unless a specific action warrants it.
  console.log(`[Clerk Webhook] Received event type ${eventType} (svix_id: ${svix_id}), no specific action taken or not explicitly handled for idempotency marking.`);
  return Response.json({ message: 'Webhook received, no specific action taken' }, { status: 200 });
} 

