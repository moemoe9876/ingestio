import { createAdminClient } from '@/lib/supabase/admin'; // Use admin client for elevated privileges
import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { Webhook } from 'svix';

// Ensure CLERK_WEBHOOK_SECRET is set in environment variables
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return new Response('Webhook secret not configured', { status: 500 });
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', { status: 400 });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with ID of ${id} and type of ${eventType}`);

  const supabase = createAdminClient();

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        const { id: userId, email_addresses, first_name, last_name, image_url, created_at, updated_at } = evt.data;
        
        const primaryEmail = email_addresses?.find(e => e.id === evt.data.primary_email_address_id)?.email_address;

        if (!primaryEmail) {
          console.warn(`Webhook user.created/updated: User ${userId} has no primary email address.`);
          // Decide if you want to proceed without an email or return an error
          // return NextResponse.json({ message: 'Primary email address missing' }, { status: 400 });
        }

        // Upsert profile data
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: userId, // Match Supabase profile ID with Clerk user ID
            email: primaryEmail, // Use primary email
            first_name: first_name,
            last_name: last_name,
            avatar_url: image_url,
            updated_at: new Date(updated_at).toISOString(), // Ensure ISO string format
            // created_at will be set by default value in DB on first insert
          });

        if (profileError) {
          console.error(`Webhook user.created/updated: Error upserting profile for ${userId}`, profileError);
          throw profileError; // Propagate error to catch block
        }
        console.log(`Webhook user.created/updated: Profile upserted for ${userId}`);

        // If it's a new user, create default settings
        if (eventType === 'user.created') {
           const { error: settingsError } = await supabase
            .from('user_settings')
            .insert({ user_id: userId }); // Default settings will be applied by DB trigger/defaults

           if (settingsError) {
             console.error(`Webhook user.created: Error creating default settings for ${userId}`, settingsError);
             // Decide if this is a critical error. Maybe just log it.
           } else {
             console.log(`Webhook user.created: Default settings created for ${userId}`);
           }
        }
        break;
      }
      case 'user.deleted': {
        const { id: userId, deleted } = evt.data;

        if (!userId) {
          console.error('Webhook user.deleted: Missing user ID');
          return NextResponse.json({ message: 'Missing user ID' }, { status: 400 });
        }

        // In Supabase, typically you might just mark the user as inactive or truly delete.
        // Since Clerk handles auth, deleting might be fine. Consider cascading deletes in Supabase schema.
        // For now, let's attempt to delete the profile.
        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error(`Webhook user.deleted: Error deleting profile for ${userId}`, error);
          // Depending on RLS/permissions, this might fail if associated data exists.
          // Consider soft delete or more robust cleanup.
          throw error;
        }
        console.log(`Webhook user.deleted: Profile deleted for ${userId}`);
        break;
      }
      default:
        console.log(`Webhook ignored: Unhandled event type ${eventType}`);
    }
    
    return NextResponse.json({ message: 'Webhook received successfully' }, { status: 200 });

  } catch (error) {
    console.error('Webhook Error processing event:', eventType, error);
    // Return 500 but Clerk might retry, ensure idempotency in handlers
    return NextResponse.json({ message: 'Internal Server Error processing webhook' }, { status: 500 });
  }
} 