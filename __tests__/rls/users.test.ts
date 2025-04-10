import { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isRlsTest, setupRlsTest, USER_A, USER_B } from "./utils";

describe.skipIf(!isRlsTest)("Users table RLS", () => {
  // Define clients and test data
  let serviceClient: SupabaseClient;
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  let anonClient: SupabaseClient;
  
  // Setup test data
  let userAData: any;
  let userBData: any;

  beforeAll(async () => {
    const clients = setupRlsTest("users");
    if (!clients) return;

    // Assign clients with proper types
    serviceClient = clients.serviceClient;
    userAClient = clients.userAClient;
    userBClient = clients.userBClient;
    anonClient = clients.anonClient;

    // Create test users if they don't exist
    try {
      const { error: errorUserA } = await serviceClient
        .from("users")
        .upsert({
          user_id: USER_A.id,
          email: USER_A.email,
          full_name: "User A Test",
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (errorUserA) {
        console.warn("Warning creating User A:", errorUserA);
      }

      const { error: errorUserB } = await serviceClient
        .from("users")
        .upsert({
          user_id: USER_B.id,
          email: USER_B.email,
          full_name: "User B Test",
        }, {
          onConflict: 'user_id'
        })
        .select();

      if (errorUserB) {
        console.warn("Warning creating User B:", errorUserB);
      }
    } catch (error) {
      console.warn("Warning in user creation:", error);
      // Continue anyway, as users might already exist
    }

    // Fetch test data for verification
    try {
      const { data: userA, error: fetchErrorA } = await serviceClient
        .from("users")
        .select("*")
        .eq("user_id", USER_A.id)
        .single();

      if (fetchErrorA) {
        console.error("Error fetching User A:", fetchErrorA);
        throw fetchErrorA;
      }
      userAData = userA;

      const { data: userB, error: fetchErrorB } = await serviceClient
        .from("users")
        .select("*")
        .eq("user_id", USER_B.id)
        .single();

      if (fetchErrorB) {
        console.error("Error fetching User B:", fetchErrorB);
        throw fetchErrorB;
      }
      userBData = userB;
    } catch (error) {
      console.error("Error fetching user data:", error);
      throw error;
    }
  });

  afterAll(async () => {
    // Clean up test data if needed
    // In this case, we might want to keep the users for other tests
  });

  // Test: User A can SELECT own record
  it("User A can SELECT own record", async () => {
    const { data, error } = await userAClient
      .from("users")
      .select("*")
      .eq("user_id", USER_A.id);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].user_id).toBe(USER_A.id);
  });

  // Test: User A CANNOT SELECT User B's record
  it("User A CANNOT SELECT User B's record", async () => {
    const { data, error } = await userAClient
      .from("users")
      .select("*")
      .eq("user_id", USER_B.id);

    expect(error).toBeNull(); // No error, just no results
    expect(data).toHaveLength(0); // Empty result due to RLS
  });

  // Test: User A can UPDATE own record
  it("User A can UPDATE own record", async () => {
    const newName = "User A Updated Name";
    const { data, error } = await userAClient
      .from("users")
      .update({ full_name: newName })
      .eq("user_id", USER_A.id)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].full_name).toBe(newName);
  });

  // Test: User A CANNOT UPDATE User B's record
  it("User A CANNOT UPDATE User B's record", async () => {
    const { data, error } = await userAClient
      .from("users")
      .update({ full_name: "Hacked Name" })
      .eq("user_id", USER_B.id)
      .select();

    // Either no rows affected or RLS error
    if (error) {
      expect(error.code).toBe("42501"); // Permission denied error
    } else {
      expect(data).toHaveLength(0); // No rows affected due to RLS
    }
  });

  // Test: User A CANNOT UPDATE own user_id (PK check)
  it("User A CANNOT UPDATE own user_id", async () => {
    const { data, error } = await userAClient
      .from("users")
      .update({ user_id: "new_id_attempt" })
      .eq("user_id", USER_A.id)
      .select();

    // Expect either an error or empty result due to RLS
    expect(error).not.toBeNull();
  });

  // Test: Anonymous CANNOT SELECT any user
  it("Anonymous CANNOT SELECT any user", async () => {
    const { data, error } = await anonClient
      .from("users")
      .select("*")
      .eq("user_id", USER_A.id);

    // Either error or empty result due to RLS
    if (error) {
      expect(error.code).toBe("42501"); // Permission denied error
    } else {
      expect(data).toHaveLength(0); // No rows affected due to RLS
    }
  });

  // Test: Service Role can SELECT all users
  it("Service Role can SELECT all users", async () => {
    const { data, error } = await serviceClient
      .from("users")
      .select("*");

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(2);
    expect(data?.some(user => user.user_id === USER_A.id)).toBe(true);
    expect(data?.some(user => user.user_id === USER_B.id)).toBe(true);
  });

  // Test: Service Role can UPDATE any user
  it("Service Role can UPDATE any user", async () => {
    const newValue = "service_updated.png";
    const { data, error } = await serviceClient
      .from("users")
      .update({ avatar_url: newValue })
      .eq("user_id", USER_B.id)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].avatar_url).toBe(newValue);
  });
}); 