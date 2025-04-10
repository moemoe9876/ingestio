import { SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { isRlsTest, setupRlsTest, USER_A, USER_B } from "./utils";

describe.skipIf(!isRlsTest)("Profiles table RLS", () => {
  // Define clients with proper types
  let serviceClient: SupabaseClient;
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  let anonClient: SupabaseClient;
  
  // Test data
  let profileAData: any;
  let profileBData: any;

  beforeAll(async () => {
    const clients = setupRlsTest("profiles");
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

    // 2. Create test profiles if they don't exist
    try {
      const { error: errorProfileA } = await serviceClient
        .from("profiles")
        .upsert({
          user_id: USER_A.id,
          membership: "starter"
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (errorProfileA) {
        console.error("Error creating Profile A:", errorProfileA);
        throw errorProfileA;
      }

      const { error: errorProfileB } = await serviceClient
        .from("profiles")
        .upsert({
          user_id: USER_B.id,
          membership: "plus"
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (errorProfileB) {
        console.error("Error creating Profile B:", errorProfileB);
        throw errorProfileB;
      }
    } catch (error) {
      console.log("Error creating profiles:", error);
      throw error;
    }

    // 3. Fetch test data for verification
    try {
      const { data: profileA, error: fetchErrorA } = await serviceClient
        .from("profiles")
        .select("*")
        .eq("user_id", USER_A.id)
        .single();

      if (fetchErrorA) {
        console.error("Error fetching Profile A:", fetchErrorA);
        throw fetchErrorA;
      }
      profileAData = profileA;

      const { data: profileB, error: fetchErrorB } = await serviceClient
        .from("profiles")
        .select("*")
        .eq("user_id", USER_B.id)
        .single();

      if (fetchErrorB) {
        console.error("Error fetching Profile B:", fetchErrorB);
        throw fetchErrorB;
      }
      profileBData = profileB;
    } catch (error) {
      console.log("Error fetching profile data:", error);
      throw error;
    }
  });

  // Test: User A can SELECT own profile
  it("User A can SELECT own profile", async () => {
    const { data, error } = await userAClient
      .from("profiles")
      .select("*")
      .eq("user_id", USER_A.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].user_id).toBe(USER_A.id);
    expect(data?.[0].membership).toBe("starter");
  });

  // Test: User A CANNOT SELECT User B's profile
  it("User A CANNOT SELECT User B's profile", async () => {
    const { data, error } = await userAClient
      .from("profiles")
      .select("*")
      .eq("user_id", USER_B.id);

    expect(error).toBeNull(); // No error, just no results
    expect(data).toHaveLength(0); // Empty result due to RLS
  });

  // Test: User A can UPDATE own profile
  it("User A can UPDATE own profile", async () => {
    const { data, error } = await userAClient
      .from("profiles")
      .update({ stripe_customer_id: "cus_test_a" })
      .eq("user_id", USER_A.id)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].stripe_customer_id).toBe("cus_test_a");
  });

  // Test: User A CANNOT UPDATE User B's profile
  it("User A CANNOT UPDATE User B's profile", async () => {
    const { data, error } = await userAClient
      .from("profiles")
      .update({ membership: "growth" })
      .eq("user_id", USER_B.id)
      .select();

    if (error) {
      expect(error.code).toBe("42501"); // Permission denied error
    } else {
      expect(data).toHaveLength(0); // No rows affected due to RLS
    }
  });

  // Test: User A CANNOT change user_id
  it("User A CANNOT change user_id", async () => {
    const { data, error } = await userAClient
      .from("profiles")
      .update({ user_id: "new_id_attempt" })
      .eq("user_id", USER_A.id)
      .select();

    expect(error).not.toBeNull();
  });

  // Test: Anonymous CANNOT SELECT any profile
  it("Anonymous CANNOT SELECT any profile", async () => {
    const { data, error } = await anonClient
      .from("profiles")
      .select("*")
      .eq("user_id", USER_A.id);

    if (error) {
      expect(error.code).toBe("42501"); // Permission denied error
    } else {
      expect(data).toHaveLength(0); // No rows affected due to RLS
    }
  });

  // Test: Service Role can SELECT all profiles
  it("Service Role can SELECT all profiles", async () => {
    const { data, error } = await serviceClient
      .from("profiles")
      .select("*");

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(2);
    expect(data?.some(profile => profile.user_id === USER_A.id)).toBe(true);
    expect(data?.some(profile => profile.user_id === USER_B.id)).toBe(true);
  });

  // Test: Service Role can UPDATE any profile
  it("Service Role can UPDATE any profile", async () => {
    const { data, error } = await serviceClient
      .from("profiles")
      .update({ 
        membership: "plus", 
        stripe_subscription_id: "sub_test_b" 
      })
      .eq("user_id", USER_B.id)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].membership).toBe("plus");
    expect(data?.[0].stripe_subscription_id).toBe("sub_test_b");
  });
}); 