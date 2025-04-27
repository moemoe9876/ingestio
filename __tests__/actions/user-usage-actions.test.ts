import { SelectUserUsage } from '@/db/schema';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies first
// Mock DB more accurately for chained calls
const mockExecute = vi.fn(); // Centralized mock for the final execution
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  returning: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  // Ensure the final call (simulating Drizzle execution) uses the mockExecute function
  then: (resolve: any, reject: any) => mockExecute().then(resolve, reject), // More robust promise handling
  catch: (reject: any) => mockExecute().catch(reject),
  finally: (callback: any) => mockExecute().finally(callback),
  // Also mock execute directly in case it's explicitly called
  execute: mockExecute,
};

vi.mock('@/db/db', () => ({
  db: mockDb,
}));

// Mock Stripe sync actions
const mockGetUserSubscriptionDataKVAction = vi.fn().mockResolvedValue({
  isSuccess: true,
  message: 'Subscription data retrieved',
  data: {
    status: 'active',
    planId: 'plus'
  }
});

vi.mock('@/actions/stripe/sync-actions', () => ({
  getUserSubscriptionDataKVAction: mockGetUserSubscriptionDataKVAction,
}));

// Mock the schema import (needed for `from` and `update` calls)
const mockUserUsageTable = {
  userId: 'mockUserId',
  billingPeriodStart: 'mockBillingPeriodStart',
  billingPeriodEnd: 'mockBillingPeriodEnd',
  pagesProcessed: 'mockPagesProcessed',
  pagesLimit: 'mockPagesLimit',
  createdAt: 'mockCreatedAt',
  updatedAt: 'mockUpdatedAt',
};

vi.mock('@/db/schema', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/db/schema')>();
  return {
    ...actual, // Import actual schema objects
    userUsageTable: mockUserUsageTable, // Keep the mock for userUsageTable specifically
  };
});

// Import after mocks to ensure mocks are applied correctly
// Mock the actual actions file - this allows us to test functions within it
// while mocking its dependencies. We need to use `vi.importActual` to get the real functions.
const actualUserUsageActions = await vi.importActual<typeof import('@/actions/db/user-usage-actions')>('@/actions/db/user-usage-actions');

// Import the functions to be tested
const { incrementPagesProcessedAction, checkUserQuotaAction, initializeUserUsageAction, getCurrentUserUsageAction, updateUserUsageAction } = actualUserUsageActions;

describe('User Usage Actions', () => {
  const mockUserId = 'test-user-123';
  const mockCurrentDate = new Date('2023-10-15T10:00:00Z');
  // Use ISO strings for date comparisons to avoid timezone issues
  const mockBillingPeriodStartISO = '2023-10-01T00:00:00.000Z';
  const mockBillingPeriodEndISO = '2023-10-31T23:59:59.999Z';
  const mockBillingPeriodStart = new Date(mockBillingPeriodStartISO);
  const mockBillingPeriodEnd = new Date(mockBillingPeriodEndISO);


  const mockUserUsageData: SelectUserUsage = {
    id: '1',
    userId: mockUserId,
    billingPeriodStart: mockBillingPeriodStart,
    billingPeriodEnd: mockBillingPeriodEnd,
    pagesProcessed: 10,
    pagesLimit: 250, // Default based on 'plus' tier from RATE_LIMIT_TIERS
    createdAt: new Date('2023-05-01T00:00:00Z'),
    updatedAt: new Date('2023-05-01T00:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock Date.now() to control time in tests
    vi.useFakeTimers();
    vi.setSystemTime(mockCurrentDate);

    // Default mock for db execute/resolution for getCurrentUserUsageAction
    // This simulates finding an existing usage record
    mockExecute.mockResolvedValue([mockUserUsageData]); // Ensure it returns an array

    // Default mock for getUserSubscriptionDataKVAction (used by initialize)
    mockGetUserSubscriptionDataKVAction.mockResolvedValue({
      isSuccess: true,
      data: {
        status: 'active',
        planId: 'plus',
      },
    });
  });

  afterEach(() => {
    // Restore Date.now()
    vi.useRealTimers();
    vi.clearAllMocks(); // Ensure mocks are cleared after each test
  });

  describe('incrementPagesProcessedAction', () => {
    it('should increment pagesProcessed correctly when within limit', async () => {
      const initialPages = 10;
      const pagesToIncrement = 5;
      const expectedNewPages = initialPages + pagesToIncrement;
      const currentLimit = 250; // Assuming plus tier
      const mockUsageId = '1'; // Add mock usage ID

      // Mock sequence:
      // 1. getCurrentUserUsageAction finds existing record
      mockExecute.mockResolvedValueOnce([
        { ...mockUserUsageData, id: mockUsageId, pagesProcessed: initialPages, pagesLimit: currentLimit },
      ]);
      // 2. updateUserUsageAction returns the updated record
      mockExecute.mockResolvedValueOnce([
        { ...mockUserUsageData, id: mockUsageId, pagesProcessed: expectedNewPages, pagesLimit: currentLimit },
      ]);

      const result = await incrementPagesProcessedAction(mockUserId, pagesToIncrement);

      expect(result.isSuccess).toBe(true);
      expect(result.data?.pagesProcessed).toBe(expectedNewPages);

      // Verify the db calls happened (select/update patterns are indirectly tested)
      expect(mockExecute).toHaveBeenCalledTimes(2); // Once for get, once for update
      expect(mockDb.update).toHaveBeenCalledWith(mockUserUsageTable); // Check update structure
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({ pagesProcessed: expectedNewPages })); // Check set structure
      // Verify where clause includes the ID for targeted update
      expect(mockDb.where).toHaveBeenCalledWith(expect.anything()); // Can't easily check the 'and' condition directly
    });

    it('should return failure if incrementing exceeds the limit', async () => {
      const currentLimit = 250;
      const initialPages = 248;
      const pagesToIncrement = 5; // 248 + 5 = 253, exceeds limit of 250

      // Mock sequence:
      // 1. getCurrentUserUsageAction finds existing record
      mockExecute.mockResolvedValueOnce([
        { ...mockUserUsageData, pagesProcessed: initialPages, pagesLimit: currentLimit },
      ]);

      const result = await incrementPagesProcessedAction(mockUserId, pagesToIncrement);

      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe("Page limit exceeded");

      // Verify only the initial 'get' call happened
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    // This test needs to correctly simulate the failure propagation from getCurrentUserUsageAction
    it('should return failure if getCurrentUserUsageAction fails (e.g., user not found/initialized)', async () => {
      // Mock sequence:
      // 1. getCurrentUserUsageAction fails (returns the failure ActionState)
      // Define the failure state type explicitly
      const failureResult: import('@/types').ActionState<SelectUserUsage> = {
        isSuccess: false,
        message: "Simulated get user failure"
      };
      // Need to mock the *result* of getCurrentUserUsageAction, not just the db call
      // This requires mocking the action itself or adjusting the structure
      // Let's stick to mocking the DB and ensure the Action returns the failure
      mockExecute.mockResolvedValueOnce([]); // First DB call (in getCurrentUserUsageAction) returns empty
      mockExecute.mockResolvedValueOnce([]); // Second DB call (in initializeUserUsageAction) returns empty
      mockGetUserSubscriptionDataKVAction.mockResolvedValueOnce({ isSuccess: false, message: 'KV failed during init' }); // Make init fail

      const result = await incrementPagesProcessedAction(mockUserId, 5);

      expect(result.isSuccess).toBe(false);
      // Check for the error message from the failing dependency (initializeUserUsageAction)
      expect(result.message).toContain('Failed to initialize usage: KV failed during init'); // Updated expected message

      // Verify the db calls for get and initialize attempt
      expect(mockExecute).toHaveBeenCalledTimes(2); // Once for get, once for initialize check
      expect(mockDb.update).not.toHaveBeenCalled(); // Update should not be called
    });
  });

  describe('checkUserQuotaAction', () => {
    it('should return hasQuota: true when sufficient quota is available', async () => {
      const initialPages = 10;
      const pagesRequired = 5;
      const pagesLimit = 250;
      const expectedRemaining = pagesLimit - initialPages;

      // Mock: getCurrentUserUsageAction finds existing record
      mockExecute.mockResolvedValueOnce([
        { ...mockUserUsageData, pagesProcessed: initialPages, pagesLimit: pagesLimit },
      ]);

      const result = await checkUserQuotaAction(mockUserId, pagesRequired);

      expect(result.isSuccess).toBe(true);
      expect(result.data?.hasQuota).toBe(true);
      expect(result.data?.remaining).toBe(expectedRemaining);
      expect(result.message).toContain(`User has sufficient quota (${expectedRemaining} pages remaining)`);

      // Verify the db 'get' call happened
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should return hasQuota: false when insufficient quota is available', async () => {
      const pagesLimit = 250;
      const initialPages = 248;
      const pagesRequired = 5; // Requires 5, but only 2 remaining
      const expectedRemaining = pagesLimit - initialPages;

      // Mock: getCurrentUserUsageAction finds existing record
      mockExecute.mockResolvedValueOnce([
        { ...mockUserUsageData, pagesProcessed: initialPages, pagesLimit: pagesLimit },
      ]);

      const result = await checkUserQuotaAction(mockUserId, pagesRequired);

      expect(result.isSuccess).toBe(true); // The check itself is successful
      expect(result.data?.hasQuota).toBe(false);
      expect(result.data?.remaining).toBe(expectedRemaining);
      expect(result.message).toContain(`Quota exceeded (${expectedRemaining} pages remaining, ${pagesRequired} required)`);

      // Verify the db 'get' call happened
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('should always return true in development environment', async () => {
      vi.stubEnv('NODE_ENV', 'development');

      const initialPages = 248;
      const pagesRequired = 5; // Would exceed limit in production

      // Mock: getCurrentUserUsageAction finds existing record (still called for tracking)
      mockExecute.mockResolvedValueOnce([
        { ...mockUserUsageData, pagesProcessed: initialPages, pagesLimit: 250 },
      ]);

      const result = await checkUserQuotaAction(mockUserId, pagesRequired);

      expect(result.isSuccess).toBe(true);
      expect(result.data?.hasQuota).toBe(true); // Quota bypassed
      expect(result.data?.remaining).toBe(999999); // Effectively unlimited in dev
      expect(result.message).toContain("Development mode: quota check bypassed");

      // Verify the db 'get' call happened
      expect(mockExecute).toHaveBeenCalledTimes(1);

      vi.unstubAllEnvs();
    });

    // This test needs to correctly simulate the failure propagation
    it('should return failure if getCurrentUserUsageAction fails', async () => {
      // Mock sequence:
      // 1. getCurrentUserUsageAction fails (returns the failure ActionState)
      mockExecute.mockResolvedValueOnce([]); // First DB call (in getCurrentUserUsageAction) returns empty
      mockExecute.mockResolvedValueOnce([]); // Second DB call (in initializeUserUsageAction) returns empty
      mockGetUserSubscriptionDataKVAction.mockResolvedValueOnce({ isSuccess: false, message: 'KV failed during init' }); // Make init fail

      const result = await checkUserQuotaAction(mockUserId, 5);

      expect(result.isSuccess).toBe(false);
      // Check for the error message from the failing dependency (initializeUserUsageAction)
      expect(result.message).toContain('Failed to initialize usage: KV failed during init'); // Updated expected message

      // Verify the db calls for get and initialize attempt
      expect(mockExecute).toHaveBeenCalledTimes(2); // Once for get, once for initialize check
    });
  });

  describe('initializeUserUsageAction', () => {
    it('should create a new usage record if none exists for the period', async () => {
      const expectedPagesLimit = 250; // From RATE_LIMIT_TIERS 'plus' tier

      // Mock sequence:
      // 1. Initial check finds no existing record
      mockExecute.mockResolvedValueOnce([]);
      // 2. KV action returns 'plus' tier
      mockGetUserSubscriptionDataKVAction.mockResolvedValueOnce({
        isSuccess: true, data: { status: 'active', planId: 'plus' },
      });
      // 3. Insert operation returns the new record
      const expectedNewUsage = {
        ...mockUserUsageData,
        userId: mockUserId,
        billingPeriodStart: mockBillingPeriodStart, // Use the Date object
        billingPeriodEnd: mockBillingPeriodEnd,     // Use the Date object
        pagesProcessed: 0,
        pagesLimit: expectedPagesLimit,
        createdAt: mockCurrentDate,
        updatedAt: mockCurrentDate,
      };
      mockExecute.mockResolvedValueOnce([expectedNewUsage]); // Insert returns array

      const result = await initializeUserUsageAction(mockUserId);

      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        userId: mockUserId,
        pagesProcessed: 0,
        pagesLimit: expectedPagesLimit, // Verify limit based on tier
      }));
      // Check dates carefully - use toISOString if direct comparison fails
      expect(result.data?.billingPeriodStart.toISOString()).toBe(mockBillingPeriodStartISO);
      expect(result.data?.billingPeriodEnd.toISOString()).toBe(mockBillingPeriodEndISO);

      // Verify DB calls: initial select + insert
      expect(mockExecute).toHaveBeenCalledTimes(2);
      // Verify insert structure
      expect(mockDb.insert).toHaveBeenCalledWith(mockUserUsageTable);
      // Expect the exact Date objects calculated by the action
      const expectedStartDate = new Date(mockCurrentDate.getFullYear(), mockCurrentDate.getMonth(), 1);
      const expectedEndDate = new Date(mockCurrentDate.getFullYear(), mockCurrentDate.getMonth() + 1, 0, 23, 59, 59, 999);
      expect(mockDb.values).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockUserId,
        pagesProcessed: 0,
        pagesLimit: expectedPagesLimit,
        billingPeriodStart: expectedStartDate,
        billingPeriodEnd: expectedEndDate,
      }));
    });

    it('should return the existing usage record if one exists for the period', async () => {
      const existingUsage = {
        ...mockUserUsageData,
        pagesProcessed: 75,
        pagesLimit: 250,
      };

      // Mock: Initial check finds the existing record
      mockExecute.mockResolvedValueOnce([existingUsage]);

      const result = await initializeUserUsageAction(mockUserId);

      expect(result.isSuccess).toBe(true);
      expect(result.message).toBe("User usage record already exists");
      expect(result.data).toEqual(existingUsage);

      // Verify only the initial select check was made
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle duplicate key error by returning the existing record', async () => {
       const expectedPagesLimit = 250; // From mock KV 'plus' tier
       const existingUsage = {
        ...mockUserUsageData,
        pagesProcessed: 75,
        pagesLimit: 250, // Assuming the existing record had this limit
      };

      // Mock sequence:
      // 1. Initial check finds no existing record
      mockExecute.mockResolvedValueOnce([]);
      // 2. KV action returns 'plus' tier
      mockGetUserSubscriptionDataKVAction.mockResolvedValueOnce({
        isSuccess: true, data: { status: 'active', planId: 'plus' },
      });
      // 3. Insert operation throws duplicate key error
      mockExecute.mockRejectedValueOnce(new Error('duplicate key value violates unique constraint'));
      // 4. Subsequent select in catch block finds the existing record
      mockExecute.mockResolvedValueOnce([existingUsage]);

      const result = await initializeUserUsageAction(mockUserId);

      expect(result.isSuccess).toBe(true);
      expect(result.message).toBe("Retrieved existing user usage record");
      expect(result.data).toEqual(existingUsage); // Should return the one found in the catch block

      // Verify DB calls: initial select, insert attempt, select in catch
      expect(mockExecute).toHaveBeenCalledTimes(3);
      expect(mockDb.insert).toHaveBeenCalledTimes(1); // Insert was attempted
    });

    it('should return failure if KV action fails during initialization', async () => {
      // Mock sequence:
      // 1. Initial check finds no existing record
      mockExecute.mockResolvedValueOnce([]);
      // 2. KV action fails
      const kvFailureMessage = 'KV fetch failed during initialization';
      mockGetUserSubscriptionDataKVAction.mockResolvedValueOnce({
        isSuccess: false, message: kvFailureMessage,
      });
      // 3. Insert should NOT be called now due to the check added in the action

      const result = await initializeUserUsageAction(mockUserId);

      expect(result.isSuccess).toBe(false);
      // Expect the message directly reflecting the KV failure
      expect(result.message).toContain(`Failed to initialize usage: ${kvFailureMessage}`);

      // Verify DB calls: only initial select and KV call should happen
      expect(mockExecute).toHaveBeenCalledTimes(1); // Only the initial check
      expect(mockGetUserSubscriptionDataKVAction).toHaveBeenCalledTimes(1);
      expect(mockDb.insert).not.toHaveBeenCalled(); // Insert should not be attempted
    });
  });
});
