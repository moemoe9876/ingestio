import { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isRlsTest, setupRlsTest, USER_A, USER_B } from "./utils";

describe.skipIf(!isRlsTest)("User Usage table RLS", () => {
  // Define clients with proper types
  let serviceClient: SupabaseClient;
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  let anonClient: SupabaseClient;
  
  // Test data
  let userAUsageId: string;
  let userBUsageId: string;

  beforeAll(async () => {
    const clients = setupRlsTest("user_usage");
    if (!clients) return;

    // Assign clients with proper types
    serviceClient = clients.serviceClient;
    userAClient = clients.userAClient;
    userBClient = clients.userBClient;
    anonClient = clients.anonClient;

    // 1. Ensure users exist first
    try {
      await serviceClient
        .from("users")
        .upsert([
          { user_id: USER_A.id, email: USER_A.email },
          { user_id: USER_B.id, email: USER_B.email }
        ], {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.log("Users already exist, continuing:", error);
    }

    // 2. Ensure profiles exist (required for foreign key constraints)
    try {
      await serviceClient
        .from("profiles")
        .upsert([
          { user_id: USER_A.id, membership: "starter" },
          { user_id: USER_B.id, membership: "plus" }
        ], {
          onConflict: 'user_id'
        });
    } catch (error) {
      console.log("Error creating profiles:", error);
      throw error;
    }

    // 3. Create test usage records
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

    // Use insert instead of upsert
    const { data: dataA, error: errorA } = await serviceClient
      .from("user_usage")
      .insert({
        user_id: USER_A.id,
        billing_period_start: now.toISOString(),
        billing_period_end: oneMonthLater.toISOString(),
        pages_limit: 25,
        pages_processed: 5
      })
      .select();

    if (errorA && errorA.code !== '23505') { // Ignore unique constraint violation if already exists
      console.error("Error creating User A usage:", errorA);
      throw errorA;
    }

    // Find the ID if it already existed or was just created
    const { data: fetchedA } = await serviceClient
      .from("user_usage")
      .select("id")
      .eq("user_id", USER_A.id)
      .single();
    userAUsageId = fetchedA?.id;

    // Use insert instead of upsert
    const { data: dataB, error: errorB } = await serviceClient
      .from("user_usage")
      .insert({
        user_id: USER_B.id,
        billing_period_start: now.toISOString(),
        billing_period_end: oneMonthLater.toISOString(),
        pages_limit: 100,
        pages_processed: 10
      })
      .select();

    if (errorB && errorB.code !== '23505') { // Ignore unique constraint violation if already exists
      console.error("Error creating User B usage:", errorB);
      throw errorB;
    }

    // Find the ID if it already existed or was just created
    const { data: fetchedB } = await serviceClient
      .from("user_usage")
      .select("id")
      .eq("user_id", USER_B.id)
      .single();
    userBUsageId = fetchedB?.id;
  });

  afterAll(async () => {
    // Clean up test usage records
    if (userAUsageId && userBUsageId) {
      await serviceClient
        .from("user_usage")
        .delete()
        .in("id", [userAUsageId, userBUsageId]);
    }
  });

  // Test: User A can SELECT own usage
  it("User A can SELECT own usage", async () => {
    const { data, error } = await userAClient
      .from("user_usage")
      .select("*")
      .eq("user_id", USER_A.id);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data?.some(usage => usage.user_id === USER_A.id)).toBe(true);
  });

  // Test: User A CANNOT SELECT User B's usage
  it("User A CANNOT SELECT User B's usage", async () => {
    const { data, error } = await userAClient
      .from("user_usage")
      .select("*")
      .eq("user_id", USER_B.id);

    expect(error).toBeNull(); // No error, just no results
    expect(data).toHaveLength(0); // Empty result due to RLS
  });

  // Test: User A CANNOT INSERT usage
  it("User A CANNOT INSERT usage", async () => {
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    
    const { data, error } = await userAClient
      .from("user_usage")
      .insert({
        user_id: USER_A.id,
        billing_period_start: now.toISOString(),
        billing_period_end: oneMonthLater.toISOString(),
        pages_limit: 25,
        pages_processed: 0
      })
      .select();

    expect(error).not.toBeNull(); // Expect an RLS policy violation error
  });

  // Test: User A CANNOT UPDATE usage
  it("User A CANNOT UPDATE usage", async () => {
    const { data, error } = await userAClient
      .from("user_usage")
      .update({ pages_processed: 10 })
      .eq("id", userAUsageId)
      .select();

    expect(error).not.toBeNull(); // Expect an RLS policy violation error
  });

  // Test: Service Role can INSERT usage
  it("Service Role can INSERT usage", async () => {
    const now = new Date();
    const oneMonthLater = new Date(now);
    oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
    
    const { data, error } = await serviceClient
      .from("user_usage")
      .insert({
        user_id: USER_A.id,
        billing_period_start: now.toISOString(),
        billing_period_end: oneMonthLater.toISOString(),
        pages_limit: 25,
        pages_processed: 0
      })
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].user_id).toBe(USER_A.id);
    
    // Clean up the created record
    if (data?.[0]?.id) {
      await serviceClient
        .from("user_usage")
        .delete()
        .eq("id", data[0].id);
    }
  });

  // Test: Service Role can UPDATE usage
  it("Service Role can UPDATE usage", async () => {
    // First check if we have a valid ID
    if (!userAUsageId) {
      // Fetch the ID if it wasn't captured correctly earlier
      const { data: fetchedA } = await serviceClient
        .from("user_usage")
        .select("id")
        .eq("user_id", USER_A.id)
        .single();
      
      userAUsageId = fetchedA?.id;
      
      // Skip test if we still can't get an ID
      if (!userAUsageId) {
        console.warn("Skipping update test - could not retrieve user usage ID");
        return;
      }
    }
    
    const newValue = 6; // Increment by 1
    const { data, error } = await serviceClient
      .from("user_usage")
      .update({ pages_processed: newValue })
      .eq("id", userAUsageId)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].pages_processed).toBe(newValue);
  });
}); 