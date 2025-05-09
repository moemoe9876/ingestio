/*
<ai_context>
This API route handles Stripe webhook events to manage subscription status changes and updates user profiles accordingly.
</ai_context>
*/

import { processStripeWebhookAction } from '@/actions/stripe';
import { db } from '@/db/db';
import { processedStripeEventsTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe server-side client directly in this route handler
// Ensure STRIPE_SECRET_KEY is set in your environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headerList = await headers();
  const signature = headerList.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    console.error('[Stripe Webhook] Missing Stripe signature');
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  if (!webhookSecret) {
    console.error('[Stripe Webhook] Stripe webhook secret is not configured.');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Idempotency Check
  const eventId = event.id;
  try {
    const [existingEvent] = await db
      .select({ eventId: processedStripeEventsTable.eventId })
      .from(processedStripeEventsTable)
      .where(eq(processedStripeEventsTable.eventId, eventId))
      .limit(1);

    if (existingEvent) {
      console.log(`[Stripe Webhook] Event ${eventId} (type: ${event.type}) already processed.`);
      return NextResponse.json({ success: true, message: 'Event already processed' });
    }
  } catch (dbError) {
    console.error(`[Stripe Webhook] Error checking for existing event ${eventId}:`, dbError);
    // If DB check fails, critical decision. For now, log and proceed with caution.
    // Consider returning 500 if this check is absolutely mandatory before any processing.
  }

  console.log(`[Stripe Webhook] Processing event ${eventId}, type: ${event.type}`);

  // Delegate to the action, passing the constructed event object (or rawBody and signature if preferred by action)
  // The current processStripeWebhookAction expects rawBody and signature.
  // To use the event object, processStripeWebhookAction would need to be refactored
  // or we can pass event.id and event.type along with rawBody if the action needs to parse event itself.
  // For minimal changes to processStripeWebhookAction, we stick to its current signature.
  // However, we now have `event` object if needed in future.
  const result = await processStripeWebhookAction(rawBody, signature, event.type, event.id);

  if (!result.isSuccess) {
    console.error(`[Stripe Webhook] Event ${eventId} (type: ${event.type}) processing failed: ${result.message}`);
    return NextResponse.json(
      { error: result.message },
      // Keep existing status logic, or refine if needed
      { status: result.message.includes('signature') || result.message.includes('Webhook Error') ? 400 : 500 }
    );
  }

  // Mark as processed if core logic succeeded
  try {
    await db.insert(processedStripeEventsTable).values({ eventId });
    console.log(`[Stripe Webhook] Marked event ${eventId} (type: ${event.type}) as processed.`);
  } catch (logError) {
    console.error(`[Stripe Webhook] Failed to mark event ${eventId} as processed, but core logic succeeded:`, logError);
    // Don't fail the response to Stripe if only marking fails.
  }

  console.log(`[Stripe Webhook] Successfully processed event ${eventId} (type: ${event.type}).`);
  return NextResponse.json({ success: true });
}