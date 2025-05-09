/**
 * Test file to verify RLS policies on webhook event tables
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSupabaseClient, isRlsTest } from './utils';

// Table names
const CLERK_EVENTS_TABLE = 'processed_clerk_events';
const STRIPE_EVENTS_TABLE = 'processed_stripe_events';

describe('Webhook tables RLS policies', () => {
  // Skip tests unless explicitly running RLS tests
  if (!isRlsTest) {
    it.skip('Skipped webhook tables RLS tests', () => {});
    return;
  }

  const testClerkEventId = 'test_clerk_event_' + Date.now();
  const testStripeEventId = 'test_stripe_event_' + Date.now();
  
  // Create clients for different roles
  const serviceClient = createSupabaseClient({ role: 'service_role' });
  const regularClient = createSupabaseClient({ role: 'anon' });

  // Setup: Insert test data using service role
  beforeAll(async () => {
    // Insert test data for Clerk events
    const { error: clerkError } = await serviceClient.from(CLERK_EVENTS_TABLE).insert({
      event_id: testClerkEventId,
      processed_at: new Date().toISOString()
    });
    
    if (clerkError) {
      console.error('Error setting up Clerk test data:', clerkError);
    }
    
    // Insert test data for Stripe events
    const { error: stripeError } = await serviceClient.from(STRIPE_EVENTS_TABLE).insert({
      event_id: testStripeEventId,
      processed_at: new Date().toISOString()
    });
    
    if (stripeError) {
      console.error('Error setting up Stripe test data:', stripeError);
    }
  });
  
  // Cleanup: Remove test data
  afterAll(async () => {
    // Remove test data for Clerk events
    const { error: clerkError } = await serviceClient.from(CLERK_EVENTS_TABLE)
      .delete()
      .eq('event_id', testClerkEventId);
    
    if (clerkError) {
      console.error('Error cleaning up Clerk test data:', clerkError);
    }
    
    // Remove test data for Stripe events
    const { error: stripeError } = await serviceClient.from(STRIPE_EVENTS_TABLE)
      .delete()
      .eq('event_id', testStripeEventId);
    
    if (stripeError) {
      console.error('Error cleaning up Stripe test data:', stripeError);
    }
  });
  
  // Test: Regular user should not be able to read Clerk events
  it('should prevent regular users from reading processed_clerk_events', async () => {
    const { data, error } = await regularClient.from(CLERK_EVENTS_TABLE).select('*');
    // With RLS, Supabase returns empty data rather than an error
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
  
  // Test: Regular user should not be able to read Stripe events
  it('should prevent regular users from reading processed_stripe_events', async () => {
    const { data, error } = await regularClient.from(STRIPE_EVENTS_TABLE).select('*');
    // With RLS, Supabase returns empty data rather than an error
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });
  
  // Test: Regular user should not be able to insert Clerk events
  it('should prevent regular users from inserting to processed_clerk_events', async () => {
    const { data, error } = await regularClient.from(CLERK_EVENTS_TABLE).insert({
      event_id: 'should_not_insert_clerk',
      processed_at: new Date().toISOString()
    });
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
  
  // Test: Regular user should not be able to insert Stripe events
  it('should prevent regular users from inserting to processed_stripe_events', async () => {
    const { data, error } = await regularClient.from(STRIPE_EVENTS_TABLE).insert({
      event_id: 'should_not_insert_stripe',
      processed_at: new Date().toISOString()
    });
    expect(error).toBeTruthy();
    expect(data).toBeNull();
  });
  
  // Test: Service role should be able to access Clerk events
  it('should allow service role to access processed_clerk_events', async () => {
    const { data, error } = await serviceClient
      .from(CLERK_EVENTS_TABLE)
      .select('*')
      .eq('event_id', testClerkEventId);
    
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].event_id).toBe(testClerkEventId);
  });
  
  // Test: Service role should be able to access Stripe events
  it('should allow service role to access processed_stripe_events', async () => {
    const { data, error } = await serviceClient
      .from(STRIPE_EVENTS_TABLE)
      .select('*')
      .eq('event_id', testStripeEventId);
    
    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].event_id).toBe(testStripeEventId);
  });
}); 