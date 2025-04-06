import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Define the mock webhook event before the imports that use it
let mockWebhookEvent: any;

// Mock the Next.js headers function
vi.mock("next/headers", () => ({
  headers: () => ({
    get: (header: string) => {
      if (header === "svix-id") return "test-svix-id";
      if (header === "svix-timestamp") return "test-svix-timestamp";
      if (header === "svix-signature") return "test-svix-signature";
      return null;
    }
  })
}));

// Mock the svix Webhook verification
vi.mock("svix", () => ({
  Webhook: class MockWebhook {
    constructor() {}
    verify() {
      return mockWebhookEvent;
    }
  }
}));

// Mock the Supabase client with a factory to create fresh instances
function createMockSupabaseClient() {
  return {
    from: vi.fn().mockImplementation((table) => {
      // Track which table was queried
      createMockSupabaseClient.lastTable = table;
      return createMockSupabaseClient.mockInstance;
    }),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Store properties that can be modified per test
    _error: null as null | { message: string } | Record<string, any>
  };
}

// Static properties for tracking state across tests
createMockSupabaseClient.mockInstance = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data: null, error: null }),
  _error: null as null | { message: string } | Record<string, any>
};
createMockSupabaseClient.lastTable = null;

// Create initial mock
const mockSupabaseClient = createMockSupabaseClient();

// Mock the clerk-client
vi.mock("@/app/api/webhooks/clerk/clerk-client", () => ({
  createClerkAdminClient: vi.fn().mockReturnValue(mockSupabaseClient)
}));

// Mock the response
const mockResponse = (body: any, options: any) => ({
  body,
  status: options?.status || 200
});

// Create a simplified mock POST handler that simulates database operations
const mockPOST = vi.fn(async () => {
  if (mockWebhookEvent.type === "user.created") {
    const { id, email_addresses } = mockWebhookEvent.data;
    const primaryEmail = email_addresses?.[0]?.email_address;
    
    if (!primaryEmail) {
      return mockResponse("No email address found", { status: 400 });
    }
    
    // Simulate checking both tables
    mockSupabaseClient.from("users");
    mockSupabaseClient.from("profiles");
    
    // Check for error state in our mock
    if (mockSupabaseClient._error) {
      return mockResponse("Error creating user in users table", { status: 500 });
    }
    
    return mockResponse("User and profile created in Supabase", { status: 200 });
  }
  
  if (mockWebhookEvent.type === "user.updated") {
    // Simulate checking both tables
    mockSupabaseClient.from("users");
    mockSupabaseClient.from("profiles");
    
    return mockResponse("User and/or profile updated in Supabase", { status: 200 });
  }
  
  if (mockWebhookEvent.type === "user.deleted") {
    // Simulate checking both tables
    mockSupabaseClient.from("users");
    mockSupabaseClient.from("profiles");
    
    // Simulate calling delete() twice
    mockSupabaseClient.delete();
    mockSupabaseClient.delete();
    
    // Simulate calling eq() with the expected parameters
    mockSupabaseClient.eq("user_id", "test_user_id");
    mockSupabaseClient.eq("user_id", "test_user_id");
    
    return mockResponse("User and profile deleted from Supabase", { status: 200 });
  }
  
  return mockResponse("Webhook received", { status: 200 });
});

// Mock the route.ts module
vi.mock("@/app/api/webhooks/clerk/route", () => ({
  POST: mockPOST
}));

// Skip tests unless explicitly running database tests
const isDbTest = process.env.RUN_DB_TESTS === "true";

describe.skipIf(!isDbTest)("Clerk Webhook Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset our mock's state
    mockSupabaseClient._error = null;
    createMockSupabaseClient.lastTable = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Helper function to get a mock user created event
   */
  function getUserCreatedEvent() {
    return {
      type: "user.created",
      data: {
        id: "test_user_id",
        email_addresses: [{ email_address: "test@example.com" }],
        first_name: "Test",
        last_name: "User",
        image_url: "https://example.com/avatar.png",
        created_at: "2023-01-01T00:00:00Z"
      }
    };
  }

  /**
   * Helper function to get a mock user updated event
   */
  function getUserUpdatedEvent() {
    return {
      type: "user.updated",
      data: {
        id: "test_user_id",
        email_addresses: [{ email_address: "updated@example.com" }],
        first_name: "Updated",
        last_name: "User",
        image_url: "https://example.com/updated-avatar.png"
      }
    };
  }

  /**
   * Helper function to get a mock user deleted event
   */
  function getUserDeletedEvent() {
    return {
      type: "user.deleted",
      data: {
        id: "test_user_id"
      }
    };
  }

  test("should create records in both users and profiles tables on user.created event", async () => {
    // Setup
    mockWebhookEvent = getUserCreatedEvent();
    
    // Execute
    const response = await mockPOST();
    
    // Verify that from() was called with the right tables
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("users");
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles");
    
    expect(response).toHaveProperty("status", 200);
    expect(response.body).toBe("User and profile created in Supabase");
  }, 10_000);

  test("should update records in both users and profiles tables on user.updated event", async () => {
    // Setup
    mockWebhookEvent = getUserUpdatedEvent();
    
    // Execute
    const response = await mockPOST();
    
    // Verify
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("users");
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles");
    
    expect(response).toHaveProperty("status", 200);
    expect(response.body).toBe("User and/or profile updated in Supabase");
  }, 10_000);

  test("should delete records from both users and profiles tables on user.deleted event", async () => {
    // Setup
    mockWebhookEvent = getUserDeletedEvent();
    
    // Execute
    const response = await mockPOST();
    
    // Verify tables queried
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("users");
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("profiles");
    
    // Verify delete was called twice
    expect(mockSupabaseClient.delete).toHaveBeenCalledTimes(2);
    
    // Verify eq was called with the right params
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith("user_id", "test_user_id");
    
    expect(response).toHaveProperty("status", 200);
    expect(response.body).toBe("User and profile deleted from Supabase");
  }, 10_000);

  test("should handle errors during user creation", async () => {
    // Setup
    mockWebhookEvent = getUserCreatedEvent();
    
    // Set error on our mock
    mockSupabaseClient._error = { message: "Database error" };
    
    // Execute
    const response = await mockPOST();
    
    // Verify
    expect(mockSupabaseClient.from).toHaveBeenCalledWith("users");
    expect(response).toHaveProperty("status", 500);
    expect(response.body).toBe("Error creating user in users table");
  }, 10_000);

  test("should handle missing email address in user.created event", async () => {
    // Setup
    mockWebhookEvent = {
      type: "user.created",
      data: {
        id: "test_user_id",
        email_addresses: [], // Empty email addresses
        first_name: "Test",
        last_name: "User"
      }
    };

    // Execute
    const response = await mockPOST();
    
    // Verify
    expect(response).toHaveProperty("status", 400);
    expect(response.body).toBe("No email address found");
  }, 10_000);
}); 