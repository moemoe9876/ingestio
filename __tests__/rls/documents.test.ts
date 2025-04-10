import { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { isRlsTest, setupRlsTest, USER_A, USER_B } from "./utils";

describe.skipIf(!isRlsTest)("Documents table RLS", () => {
  // Define clients with proper types
  let serviceClient: SupabaseClient;
  let userAClient: SupabaseClient;
  let userBClient: SupabaseClient;
  let anonClient: SupabaseClient;
  
  // Test data
  let docAId: string;
  let docBId: string;

  beforeAll(async () => {
    const clients = setupRlsTest("documents");
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

    // 3. Create test documents
    docAId = randomUUID();
    const { error: errorDocA } = await serviceClient
      .from("documents")
      .upsert({
        id: docAId,
        user_id: USER_A.id,
        original_filename: "invoice_a.pdf",
        storage_path: `${USER_A.id}/doc_a_1.pdf`,
        mime_type: "application/pdf",
        file_size: 1000,
        page_count: 1,
        status: "uploaded"
      });

    if (errorDocA) {
      console.error("Error creating Document A:", errorDocA);
      throw errorDocA;
    }

    docBId = randomUUID();
    const { error: errorDocB } = await serviceClient
      .from("documents")
      .upsert({
        id: docBId,
        user_id: USER_B.id,
        original_filename: "receipt_b.png",
        storage_path: `${USER_B.id}/doc_b_1.png`,
        mime_type: "image/png",
        file_size: 500,
        page_count: 1,
        status: "uploaded"
      });

    if (errorDocB) {
      console.error("Error creating Document B:", errorDocB);
      throw errorDocB;
    }
  });

  afterAll(async () => {
    // Clean up test documents
    await serviceClient
      .from("documents")
      .delete()
      .in("id", [docAId, docBId]);
  });

  // Test: User A can SELECT own documents
  it("User A can SELECT own documents", async () => {
    const { data, error } = await userAClient
      .from("documents")
      .select("*")
      .eq("user_id", USER_A.id);

    expect(error).toBeNull();
    expect(data?.length).toBeGreaterThanOrEqual(1);
    expect(data?.some(doc => doc.id === docAId)).toBe(true);
  });

  // Test: User A CANNOT SELECT User B's documents
  it("User A CANNOT SELECT User B's documents", async () => {
    const { data, error } = await userAClient
      .from("documents")
      .select("*")
      .eq("user_id", USER_B.id);

    expect(error).toBeNull(); // No error, just no results
    expect(data).toHaveLength(0); // Empty result due to RLS
  });

  // Test: User A can INSERT own document
  it("User A can INSERT own document", async () => {
    const newDocId = randomUUID();
    const { data, error } = await userAClient
      .from("documents")
      .insert({
        id: newDocId,
        user_id: USER_A.id,
        original_filename: "test_a.pdf",
        storage_path: `${USER_A.id}/new.pdf`,
        mime_type: "application/pdf",
        file_size: 100,
        page_count: 1,
        status: "uploaded"
      })
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].id).toBe(newDocId);
    
    // Clean up the created document
    await serviceClient
      .from("documents")
      .delete()
      .eq("id", newDocId);
  });

  // Test: User A CANNOT INSERT document for User B
  it("User A CANNOT INSERT document for User B", async () => {
    const newDocId = randomUUID();
    const { data, error } = await userAClient
      .from("documents")
      .insert({
        id: newDocId,
        user_id: USER_B.id, // Trying to insert for User B
        original_filename: "hack.pdf",
        storage_path: `${USER_B.id}/hack.pdf`,
        mime_type: "application/pdf",
        file_size: 100,
        page_count: 1,
        status: "uploaded"
      })
      .select();

    expect(error).not.toBeNull(); // Expect an RLS policy violation error
  });

  // Test: User A can UPDATE own document status
  it("User A can UPDATE own document status", async () => {
    const { data, error } = await userAClient
      .from("documents")
      .update({ status: "processing" })
      .eq("id", docAId)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].status).toBe("processing");
  });

  // Test: User A CANNOT UPDATE User B's document status
  it("User A CANNOT UPDATE User B's document status", async () => {
    const { data, error } = await userAClient
      .from("documents")
      .update({ status: "processing" })
      .eq("id", docBId)
      .select();

    if (error) {
      expect(error.code).toBe("42501"); // Permission denied error
    } else {
      expect(data).toHaveLength(0); // No rows affected due to RLS
    }
  });

  // Test: User A CANNOT UPDATE user_id of own document
  it("User A CANNOT UPDATE user_id of own document", async () => {
    const { data, error } = await userAClient
      .from("documents")
      .update({ user_id: USER_B.id })
      .eq("id", docAId)
      .select();

    expect(error).not.toBeNull(); // Expect an RLS policy violation error
  });

  // Test: User A can DELETE own document
  it("User A can DELETE own document", async () => {
    // Create a temporary document that we can delete
    const tempDocId = randomUUID();
    await serviceClient
      .from("documents")
      .insert({
        id: tempDocId,
        user_id: USER_A.id,
        original_filename: "to_delete.pdf",
        storage_path: `${USER_A.id}/to_delete.pdf`,
        mime_type: "application/pdf",
        file_size: 100,
        page_count: 1,
        status: "uploaded"
      });
    
    // Now try to delete it as user A
    const { error } = await userAClient
      .from("documents")
      .delete()
      .eq("id", tempDocId);

    expect(error).toBeNull();
    
    // Verify it's deleted
    const { data: verifyData } = await serviceClient
      .from("documents")
      .select("*")
      .eq("id", tempDocId);
    
    expect(verifyData).toHaveLength(0);
  });

  // Test: User A CANNOT DELETE User B's document
  it("User A CANNOT DELETE User B's document", async () => {
    const { error } = await userAClient
      .from("documents")
      .delete()
      .eq("id", docBId);

    if (error) {
      expect(error.code).toBe("42501"); // Permission denied error
    } else {
      // If no error, verify the document still exists (was not deleted)
      const { data: verifyData } = await serviceClient
        .from("documents")
        .select("*")
        .eq("id", docBId);
      
      expect(verifyData).toHaveLength(1);
    }
  });

  // Test: Service Role can access/modify any document
  it("Service Role can access/modify any document", async () => {
    const { data, error } = await serviceClient
      .from("documents")
      .update({ status: "failed" })
      .eq("id", docBId)
      .select();

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data?.[0].status).toBe("failed");
  });
}); 