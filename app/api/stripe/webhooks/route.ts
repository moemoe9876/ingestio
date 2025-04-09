/*
<ai_context>
This API route handles Stripe webhook events to manage subscription status changes and updates user profiles accordingly.
</ai_context>
*/

import { processStripeWebhookAction } from '@/actions/stripe'
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Get the request body as text for signature verification
    const rawBody = await request.text()
    
    // Get the Stripe signature from headers
    const signature = headers().get('stripe-signature')
    
    if (!signature) {
      console.error('Missing Stripe signature')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }
    
    // Process the webhook
    const result = await processStripeWebhookAction(rawBody, signature)
    
    if (!result.isSuccess) {
      console.error('Webhook processing failed:', result.message)
      // Return 400 for signature verification failures, 500 for other errors
      return NextResponse.json(
        { error: result.message },
        { status: result.message.includes('signature') ? 400 : 500 }
      )
    }
    
    // Return success (Stripe expects a 200 response)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in Stripe webhook handler:', error)
    
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

// Disable body parsing - we need the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false
  }
}