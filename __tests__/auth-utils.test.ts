import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock Clerk's auth function
const mockAuth = vi.fn();
vi.mock('@clerk/nextjs/server', () => ({
  auth: () => mockAuth(),
  currentUser: vi.fn() 
}));

// Mock next/navigation redirect
vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

// Import functions AFTER mocks are set up
import { getCurrentUser, isUserAuthenticated } from '@/lib/auth-utils';

describe('Authentication Utilities', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    test('should return userId when authenticated', async () => {
      const testUserId = 'user_test_123';
      mockAuth.mockResolvedValue({ userId: testUserId });

      const userId = await getCurrentUser();
      expect(userId).toBe(testUserId);
    });

    test('should throw an error when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      await expect(getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('isUserAuthenticated', () => {
    test('should return true when authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: 'user_test_123' });

      const isAuthenticated = await isUserAuthenticated();
      expect(isAuthenticated).toBe(true);
    });

    test('should return false when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const isAuthenticated = await isUserAuthenticated();
      expect(isAuthenticated).toBe(false);
    });
  });
}); 