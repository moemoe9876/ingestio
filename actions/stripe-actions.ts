/*
<ai_context>
Contains server actions related to Stripe.
</ai_context>
*/

import {
  updateProfileAction,
  updateProfileByStripeCustomerIdAction
} from "@/actions/db/profiles-actions"
import { SelectProfile } from "@/db/schema"
import { stripe } from "@/lib/stripe"
import { PostHog } from 'posthog-node'
import Stripe from "stripe"

type MembershipStatus = SelectProfile["membership"]

const getMembershipStatus = (
  status: Stripe.Subscription.Status,
  membership: MembershipStatus
): MembershipStatus => {
  switch (status) {
    case "active":
    case "trialing":
      return membership
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "past_due":
    case "paused":
    case "unpaid":
      return "free"
    default:
      return "free"
  }
}

const getSubscription = async (subscriptionId: string) => {
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method"]
  })
}

// Initialize PostHog client
const posthog = new PostHog(
  process.env.NEXT_PUBLIC_POSTHOG_KEY!,
  { host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com' }
)

export const updateStripeCustomer = async (
  userId: string,
  subscriptionId: string,
  customerId: string
) => {
  try {
    if (!userId) {
      console.error("Missing userId in updateStripeCustomer");
      throw new Error("Missing userId parameter for updateStripeCustomer")
    }
    
    if (!subscriptionId) {
      console.error("Missing subscriptionId in updateStripeCustomer");
      throw new Error("Missing subscriptionId parameter for updateStripeCustomer")
    }
    
    if (!customerId) {
      console.error("Missing customerId in updateStripeCustomer");
      throw new Error("Missing customerId parameter for updateStripeCustomer")
    }

    console.log(`Updating user ${userId} with Stripe customer ${customerId} and subscription ${subscriptionId}`);
    
    const subscription = await getSubscription(subscriptionId)
    console.log(`Retrieved subscription: ${subscription.id}, status: ${subscription.status}`);

    const result = await updateProfileAction(userId, {
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id
    })

    if (!result.isSuccess) {
      console.error(`Failed to update profile for user ${userId}:`, result.message);
      throw new Error(`Failed to update customer profile: ${result.message}`)
    }

    console.log(`Successfully updated profile for user ${userId} with Stripe data`);
    return result.data
  } catch (error) {
    console.error("Error in updateStripeCustomer:", error)
    throw error instanceof Error
      ? error
      : new Error("Failed to update Stripe customer")
  }
}

export const manageSubscriptionStatusChange = async (
  subscriptionId: string,
  customerId: string,
  productId: string
): Promise<MembershipStatus> => {
  try {
    if (!subscriptionId) {
      console.error("Missing subscriptionId in manageSubscriptionStatusChange");
      throw new Error("Missing subscriptionId parameter for manageSubscriptionStatusChange")
    }
    
    if (!customerId) {
      console.error("Missing customerId in manageSubscriptionStatusChange");
      throw new Error("Missing customerId parameter for manageSubscriptionStatusChange")
    }
    
    if (!productId) {
      console.error("Missing productId in manageSubscriptionStatusChange");
      throw new Error("Missing productId parameter for manageSubscriptionStatusChange")
    }

    console.log(`Managing subscription status change for customer ${customerId}, subscription ${subscriptionId}, product ${productId}`);
    
    const subscription = await getSubscription(subscriptionId)
    const product = await stripe.products.retrieve(productId)
    console.log(`Product metadata for ${productId}:`, product.metadata);
    
    const membership = product.metadata.membership as MembershipStatus

    if (!["free", "basic", "pro"].includes(membership)) {
      console.warn(`Product metadata has unexpected membership type: ${membership}. Defaulting to "free".`)
      // Default to free if metadata isn't properly set
      return "free"
    }

    const membershipStatus = getMembershipStatus(
      subscription.status,
      membership
    )
    
    console.log(`Determined membership status: ${membershipStatus} for subscription status: ${subscription.status}`);

    const updateResult = await updateProfileByStripeCustomerIdAction(
      customerId,
      {
        stripeSubscriptionId: subscription.id,
        membership: membershipStatus
      }
    )

    if (!updateResult.isSuccess) {
      console.error(`Failed to update profile for customer ${customerId}:`, updateResult.message);
      throw new Error(`Failed to update subscription status: ${updateResult.message}`)
    }

    console.log(`Successfully updated membership to ${membershipStatus} for customer ${customerId}`);

    // For subscription events
    posthog.capture({
      distinctId: customerId,
      event: 'subscription_status_changed',
      properties: {
        previous_status: subscription.status,
        current_status: membershipStatus,
        plan: product.name,
        event_source: 'stripe_webhook'
      }
    })

    return membershipStatus
  } catch (error) {
    console.error("Error in manageSubscriptionStatusChange:", error)
    throw error instanceof Error
      ? error
      : new Error("Failed to update subscription status")
  }
}



