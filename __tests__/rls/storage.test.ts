import { randomUUID } from "crypto";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { USER_A, USER_B, createSupabaseClient } from "./utils";

// Skip tests unless explicitly running storage tests
const isStorageTest = process.env.RUN_STORAGE_TESTS === "true";

// Test file data
const testPdfBuffer = Buffer.from("fake PDF content");
const testJsonBuffer = Buffer.from(JSON.stringify({ test: "data" }));

// Test bucket names
const DOCUMENTS_BUCKET = "documents";
const EXPORTS_BUCKET = "exports";

// Test users structure for compatibility
const testUsers = {
  userA: USER_A,
  userB: USER_B
};

describe.skipIf(!isStorageTest)("Storage RLS Policies", () => {
  let userAClient: any;
  let userBClient: any;
  let anonClient: any;
  let serviceClient: any;
  
  let userADocPath: string;
  let userBDocPath: string;
  let userAExportPath: string;
  let userBExportPath: string;

  beforeAll(async () => {
    // Create clients using the established authentication method
    serviceClient = createSupabaseClient({ role: "service_role" });
    
    userAClient = createSupabaseClient({
      role: "authenticated", 
      userId: testUsers.userA.id,
      email: testUsers.userA.email
    });
    
    userBClient = createSupabaseClient({
      role: "authenticated", 
      userId: testUsers.userB.id,
      email: testUsers.userB.email
    });
    
    anonClient = createSupabaseClient({ role: "anon" });
    
    // Generate unique paths for test files
    const timestamp = Date.now();
    userADocPath = `${testUsers.userA.id}/test-${timestamp}.pdf`;
    userBDocPath = `${testUsers.userB.id}/test-${timestamp}.pdf`;
    userAExportPath = `${testUsers.userA.id}/export-${timestamp}.json`;
    userBExportPath = `${testUsers.userB.id}/export-${timestamp}.json`;
    
    // Upload test files using service role (to ensure they exist)
    await serviceClient.storage.from(DOCUMENTS_BUCKET).upload(userADocPath, testPdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    
    await serviceClient.storage.from(DOCUMENTS_BUCKET).upload(userBDocPath, testPdfBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    
    await serviceClient.storage.from(EXPORTS_BUCKET).upload(userAExportPath, testJsonBuffer, {
      contentType: 'application/json',
      upsert: true
    });
    
    await serviceClient.storage.from(EXPORTS_BUCKET).upload(userBExportPath, testJsonBuffer, {
      contentType: 'application/json',
      upsert: true
    });
    
    // Log client headers for debugging auth context
    console.log("User A client auth headers:", (userAClient as any).supabaseUrl, (userAClient as any).headers);
    console.log("User B client auth headers:", (userBClient as any).supabaseUrl, (userBClient as any).headers);
  });
  
  afterAll(async () => {
    // Clean up test files
    await serviceClient.storage.from(DOCUMENTS_BUCKET).remove([userADocPath, userBDocPath]);
    await serviceClient.storage.from(EXPORTS_BUCKET).remove([userAExportPath, userBExportPath]);
  });

  // Authentication verification tests
  describe("Authentication Verification", () => {
    test("User A auth.uid() matches expected ID", async () => {
      const { data, error } = await userAClient.rpc('get_my_auth_uid');
      console.log("User A auth.uid() from DB:", data);
      expect(error).toBeNull();
      expect(data).toBe(testUsers.userA.id);
    });

    test("User B auth.uid() matches expected ID", async () => {
      const { data, error } = await userBClient.rpc('get_my_auth_uid');
      console.log("User B auth.uid() from DB:", data);
      expect(error).toBeNull();
      expect(data).toBe(testUsers.userB.id);
    });

    test("Anonymous user has no auth.uid()", async () => {
      const { data, error } = await anonClient.rpc('get_my_auth_uid');
      console.log("Anonymous auth.uid() from DB:", data);
      // Either it returns null or an error, both are acceptable
      if (error === null) {
        expect(data).toBeNull();
      }
    });

    test("storage.foldername function works correctly", async () => {
      const testPath = `${testUsers.userA.id}/test-file.pdf`;
      const { data, error } = await serviceClient.rpc('test_storage_foldername', { path: testPath });
      console.log(`storage.foldername test for path '${testPath}': ${data}`);
      expect(error).toBeNull();
      expect(data).toBe(testUsers.userA.id);
    });

    test("RLS check function evaluates correctly", async () => {
      const testPath = `${testUsers.userA.id}/test-file.pdf`;
      const { data, error } = await serviceClient.rpc('debug_storage_rls_check', { 
        user_id: testUsers.userA.id, 
        path: testPath 
      });
      console.log(`RLS check for user_id=${testUsers.userA.id}, path='${testPath}': ${data}`);
      expect(error).toBeNull();
      expect(data).toBe(true);

      // Check with wrong user ID
      const { data: wrongData } = await serviceClient.rpc('debug_storage_rls_check', { 
        user_id: testUsers.userB.id, 
        path: testPath 
      });
      console.log(`RLS check for user_id=${testUsers.userB.id}, path='${testPath}': ${wrongData}`);
      expect(wrongData).toBe(false);
    });
  });
  
  // Test group A: Authenticated User A tests
  describe("Authenticated User A", () => {
    // Documents bucket tests
    test("can upload to their own path in documents bucket", async () => {
      const testPath = `${testUsers.userA.id}/upload-test-${randomUUID()}.pdf`;
      const { error } = await userAClient.storage.from(DOCUMENTS_BUCKET)
        .upload(testPath, testPdfBuffer, { contentType: 'application/pdf' });
      
      expect(error).toBeNull();
      
      // Clean up
      await serviceClient.storage.from(DOCUMENTS_BUCKET).remove([testPath]);
    });
    
    test("can download their own documents", async () => {
      const { data, error } = await userAClient.storage.from(DOCUMENTS_BUCKET).download(userADocPath);
      
      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });
    
    test("can list their own documents folder", async () => {
      const { data, error } = await userAClient.storage.from(DOCUMENTS_BUCKET)
        .list(testUsers.userA.id);
      
      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThan(0);
    });
    
    test("cannot upload to another user's path in documents bucket", async () => {
      const testPath = `${testUsers.userB.id}/unauthorized-test-${randomUUID()}.pdf`;
      const { error } = await userAClient.storage.from(DOCUMENTS_BUCKET)
        .upload(testPath, testPdfBuffer, { contentType: 'application/pdf' });
      
      expect(error).not.toBeNull();
    });
    
    test("cannot download another user's documents", async () => {
      const { error } = await userAClient.storage.from(DOCUMENTS_BUCKET).download(userBDocPath);
      
      expect(error).not.toBeNull();
    });
    
    test("cannot list another user's documents folder", async () => {
      const { data, error } = await userAClient.storage.from(DOCUMENTS_BUCKET)
        .list(testUsers.userB.id);
      
      // The policy might return empty results rather than an explicit error
      if (error === null) {
        expect(data?.length).toBe(0);
      } else {
        expect(error).not.toBeNull();
      }
    });
    
    // Exports bucket tests
    test("can upload to their own path in exports bucket", async () => {
      const testPath = `${testUsers.userA.id}/export-test-${randomUUID()}.json`;
      const { error } = await userAClient.storage.from(EXPORTS_BUCKET)
        .upload(testPath, testJsonBuffer, { contentType: 'application/json' });
      
      expect(error).toBeNull();
      
      // Clean up
      await serviceClient.storage.from(EXPORTS_BUCKET).remove([testPath]);
    });
    
    test("can download their own exports", async () => {
      const { data, error } = await userAClient.storage.from(EXPORTS_BUCKET).download(userAExportPath);
      
      expect(error).toBeNull();
      expect(data).not.toBeNull();
    });
    
    test("cannot access another user's exports", async () => {
      const { error } = await userAClient.storage.from(EXPORTS_BUCKET).download(userBExportPath);
      
      expect(error).not.toBeNull();
    });
  });
  
  // Test group B: Authenticated User B tests
  describe("Authenticated User B", () => {
    test("can access their own documents but not User A's", async () => {
      const { data: ownData, error: ownError } = await userBClient.storage
        .from(DOCUMENTS_BUCKET).download(userBDocPath);
      
      expect(ownError).toBeNull();
      expect(ownData).not.toBeNull();
      
      const { error: unauthorizedError } = await userBClient.storage
        .from(DOCUMENTS_BUCKET).download(userADocPath);
      
      expect(unauthorizedError).not.toBeNull();
    });
    
    test("can access their own exports but not User A's", async () => {
      const { data: ownData, error: ownError } = await userBClient.storage
        .from(EXPORTS_BUCKET).download(userBExportPath);
      
      expect(ownError).toBeNull();
      expect(ownData).not.toBeNull();
      
      const { error: unauthorizedError } = await userBClient.storage
        .from(EXPORTS_BUCKET).download(userAExportPath);
      
      expect(unauthorizedError).not.toBeNull();
    });
  });
  
  // Test group C: Anonymous user tests
  describe("Anonymous User", () => {
    test("cannot access documents bucket", async () => {
      const { error: downloadError } = await anonClient.storage
        .from(DOCUMENTS_BUCKET).download(userADocPath);
      
      expect(downloadError).not.toBeNull();
      
      const { error: listError, data: listData } = await anonClient.storage
        .from(DOCUMENTS_BUCKET).list(testUsers.userA.id);
      
      // The policy might return empty results rather than an explicit error for list operations
      if (listError === null) {
        expect(listData?.length).toBe(0);
      } else {
        expect(listError).not.toBeNull();
      }
    });
    
    test("cannot access exports bucket", async () => {
      const { error: downloadError } = await anonClient.storage
        .from(EXPORTS_BUCKET).download(userAExportPath);
      
      expect(downloadError).not.toBeNull();
      
      const { error: listError, data: listData } = await anonClient.storage
        .from(EXPORTS_BUCKET).list(testUsers.userA.id);
      
      // The policy might return empty results rather than an explicit error for list operations
      if (listError === null) {
        expect(listData?.length).toBe(0);
      } else {
        expect(listError).not.toBeNull();
      }
    });
  });
  
  // Test group D: Service role tests
  describe("Service Role", () => {
    test("can access any document regardless of ownership", async () => {
      const { data: userAData, error: userAError } = await serviceClient.storage
        .from(DOCUMENTS_BUCKET).download(userADocPath);
      
      expect(userAError).toBeNull();
      expect(userAData).not.toBeNull();
      
      const { data: userBData, error: userBError } = await serviceClient.storage
        .from(DOCUMENTS_BUCKET).download(userBDocPath);
      
      expect(userBError).toBeNull();
      expect(userBData).not.toBeNull();
    });
    
    test("can access any export regardless of ownership", async () => {
      const { data: userAData, error: userAError } = await serviceClient.storage
        .from(EXPORTS_BUCKET).download(userAExportPath);
      
      expect(userAError).toBeNull();
      expect(userAData).not.toBeNull();
      
      const { data: userBData, error: userBError } = await serviceClient.storage
        .from(EXPORTS_BUCKET).download(userBExportPath);
      
      expect(userBError).toBeNull();
      expect(userBData).not.toBeNull();
    });
    
    test("can upload to any path in any bucket", async () => {
      const servicePath = `service/test-${randomUUID()}.pdf`;
      const { error } = await serviceClient.storage.from(DOCUMENTS_BUCKET)
        .upload(servicePath, testPdfBuffer, { contentType: 'application/pdf' });
      
      expect(error).toBeNull();
      
      // Clean up
      await serviceClient.storage.from(DOCUMENTS_BUCKET).remove([servicePath]);
    });
  });
  
  // Additional test for file size limits
  describe("File Size Limits", () => {
    test("rejects files over the size limit", async () => {
      // Create a buffer larger than the 10MB limit for documents
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      const testPath = `${testUsers.userA.id}/large-file-test.pdf`;
      const { error } = await userAClient.storage.from(DOCUMENTS_BUCKET)
        .upload(testPath, largeBuffer, { contentType: 'application/pdf' });
      
      expect(error).not.toBeNull();
      expect(error?.message).toContain("size");
    }, 15000); // Increase timeout to 15 seconds
  });
  
  // Additional test for MIME type restrictions
  describe("MIME Type Restrictions", () => {
    test("rejects files with invalid MIME types", async () => {
      const testPath = `${testUsers.userA.id}/invalid-type-test.php`;
      const phpBuffer = Buffer.from("<?php echo 'test'; ?>");
      
      const { error } = await userAClient.storage.from(DOCUMENTS_BUCKET)
        .upload(testPath, phpBuffer, { contentType: 'application/x-php' });
      
      expect(error).not.toBeNull();
      expect(error?.message).toContain("mime");
    });
  });
}); 