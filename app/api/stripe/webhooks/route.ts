/*
<ai_context>
This API route handles Stripe webhook events to manage subscription status changes and updates user profiles accordingly.
</ai_context>
*/

import {
  manageSubscriptionStatusChange,
  updateStripeCustomer
} from "@/actions/stripe-actions"
import { stripe } from "@/lib/stripe"
import { headers } from "next/headers"
import Stripe from "stripe"

// Events we process specially
const relevantEvents = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted"
])

export async function POST(req: Request) {
  // Always return 200 for Stripe, even if there are errors
  const respondWithSuccess = () => new Response(JSON.stringify({ received: true }))

  try {
    const body = await req.text()
    const sig = (await headers()).get("Stripe-Signature")
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    
    if (!sig || !webhookSecret) {
      console.error("Webhook secret or signature missing")
      return respondWithSuccess() // Return 200 even on error
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
      console.log(`Webhook received: ${event.type}`)
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`)
      return respondWithSuccess() // Return 200 even on signature verification failure
    }

    // Only process events we're specifically interested in
    if (relevantEvents.has(event.type)) {
      try {
        switch (event.type) {
          case "customer.subscription.updated":
          case "customer.subscription.deleted":
            await handleSubscriptionChange(event)
            break

          case "checkout.session.completed":
            await handleCheckoutSession(event)
            break

          default:
            console.log(`Unhandled relevant event: ${event.type}`)
        }
      } catch (error) {
        // Log error but still return 200
        console.error(`Webhook handler failed for ${event.type}:`, error)
      }
    } else {
      console.log(`Received event ${event.type} - no special handling needed`)
    }
  } catch (error) {
    // Catch any other potential errors
    console.error("Unhandled error in webhook processing:", error)
  }

  // Always return 200 success for Stripe webhooks
  return respondWithSuccess()
}

async function handleSubscriptionChange(event: Stripe.Event) {
  try {
    if (!event?.data?.object) {
      console.error("Missing event data object")
      return
    }

    const subscription = event.data.object as Stripe.Subscription
    
    if (!subscription?.id) {
      console.error("Missing subscription ID")
      return
    }
    
    if (!subscription?.items?.data?.[0]?.price?.product) {
      console.error("Subscription data is incomplete - missing product ID")
      return
    }
    
    const productId = subscription.items.data[0].price.product as string
    
    if (!subscription.customer) {
      console.error("Subscription is missing customer ID")
      return
    }
    
    await manageSubscriptionStatusChange(
      subscription.id,
      subscription.customer as string,
      productId
    )
  } catch (error) {
    console.error("Error in handleSubscriptionChange:", error)
    // Don't rethrow
  }
}

async function handleCheckoutSession(event: Stripe.Event) {
  try {
    if (!event?.data?.object) {
      console.error("Missing event data object")
      return
    }

    const checkoutSession = event.data.object as Stripe.Checkout.Session
    
    // Log basic info for debugging
    console.log("Processing checkout session:", {
      id: checkoutSession?.id || "missing",
      mode: checkoutSession?.mode || "missing",
      subscription: checkoutSession?.subscription || "missing",
      customerId: checkoutSession?.customer || "missing",
      client_reference_id: checkoutSession?.client_reference_id || "missing"
    })
    
    if (!checkoutSession?.id) {
      console.error("Missing checkout session ID")
      return
    }
    
    if (checkoutSession.mode !== "subscription") {
      console.log("Ignoring non-subscription checkout session")
      return
    }
    
    if (!checkoutSession.subscription) {
      console.error("Missing subscription ID in checkout session")
      return
    }
    
    if (!checkoutSession.customer) {
      console.error("Missing customer ID in checkout session")
      return
    }
    
    // If client_reference_id is missing, we can't link this to a user
    if (!checkoutSession.client_reference_id) {
      console.warn("Missing client_reference_id in checkout session - can't link to user account")
      try {
        // Still update the subscription to keep track of it
        const subscriptionId = checkoutSession.subscription as string
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["default_payment_method"]
        })
        
        if (!subscription?.items?.data?.[0]?.price?.product) {
          console.error("Subscription data is incomplete - missing product ID")
          return
        }
        
        const productId = subscription.items.data[0].price.product as string
        await manageSubscriptionStatusChange(
          subscription.id,
          checkoutSession.customer as string,
          productId
        )
      } catch (subError) {
        console.error("Error processing subscription without client_reference_id:", subError)
      }
      return
    }
    
    try {
      const subscriptionId = checkoutSession.subscription as string
      await updateStripeCustomer(
        checkoutSession.client_reference_id,
        subscriptionId,
        checkoutSession.customer as string
      )
    } catch (updateError) {
      console.error("Error in updateStripeCustomer:", updateError)
      // Continue to next step even if this fails
    }

    try {
      const subscriptionId = checkoutSession.subscription as string
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["default_payment_method"]
      })

      if (!subscription?.items?.data?.[0]?.price?.product) {
        console.error("Retrieved subscription data is incomplete - missing product ID")
        return
      }

      const productId = subscription.items.data[0].price.product as string
      await manageSubscriptionStatusChange(
        subscription.id,
        checkoutSession.customer as string,
        productId
      )
    } catch (statusError) {
      console.error("Error in managing subscription status:", statusError)
    }
  } catch (error) {
    console.error("Error in handleCheckoutSession:", error)
    // Don't rethrow
  }
}