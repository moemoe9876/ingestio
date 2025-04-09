/*
 * API route for creating Stripe billing portal sessions
 */

import { createBillingPortalSessionAction } from '@/actions/stripe'
import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

// Validate request schema
const billingPortalRequestSchema = z.object({
  returnUrl: z.string().optional() // Optional return URL
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
    const validationResult = billingPortalRequestSchema.safeParse(body)
    
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
    const { returnUrl } = validationResult.data
    
    // Create billing portal session
    const result = await createBillingPortalSessionAction(
      userId,
      returnUrl || '/settings/billing' // Default return URL
    )
    
    if (!result.isSuccess) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }
    
    // Return the portal URL
    return NextResponse.json({
      url: result.data.url
    })
  } catch (error) {
    console.error('Error creating billing portal session:', error)
    
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    )
  }
} 