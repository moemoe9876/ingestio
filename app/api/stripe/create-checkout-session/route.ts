/*
 * API route for creating Stripe checkout sessions
 */

import { createCheckoutSessionAction } from '@/actions/stripe'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validate request schema
const checkoutRequestSchema = z.object({
  planId: z.enum(['plus', 'growth']), // Only allow paid plans
  userId: z.string().optional() // Optional since we can get it from auth
})

export async function POST(request: Request) {
  try {
    // Get authenticated user
    const session = await auth()
    const userId = session.userId
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    // Parse request body
    const body = await request.json()
    
    // Validate request
    const validationResult = checkoutRequestSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Invalid request',
          details: validationResult.error.format()
        },
        { status: 400 }
      )
    }
    
    // Use the validated data
    const { planId } = validationResult.data
    
    // Create checkout session
    const result = await createCheckoutSessionAction(
      userId,
      planId as any,
      '/settings/billing' // Return to billing page
    )
    
    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
    
    // Return the session ID and URL
    return NextResponse.json({
      sessionId: result.data.sessionId,
      url: result.data.url
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
} 