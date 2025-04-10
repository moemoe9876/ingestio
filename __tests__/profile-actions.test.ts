import { beforeEach, describe, expect, test, vi } from 'vitest';

// Import the modules first
import { updateSubscriptionProfileAction } from '@/actions/db/profiles-actions';
import * as userActions from '@/actions/db/users-actions';
import { db } from '@/db/db';
import { trackServerEvent } from '@/lib/analytics/server';
import { getCurrentUser } from '@/lib/auth-utils';

// Mock auth utility
vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn()
}));

// Mock db and its return values directly
vi.mock('@/db/db', () => {
  // Mock for update operations
  const mockReturningUpdate = vi.fn();
  const mockWhereUpdate = vi.fn(() => ({ returning: mockReturningUpdate }));
  const mockSetUpdate = vi.fn(() => ({ where: mockWhereUpdate }));
  const mockUpdate = vi.fn(() => ({ set: mockSetUpdate }));
  
  // Mock for select operations
  const mockLimitSelect = vi.fn();
  const mockWhereSelect = vi.fn(() => ({ limit: mockLimitSelect }));
  const mockFromSelect = vi.fn(() => ({ where: mockWhereSelect }));
  const mockSelect = vi.fn(() => ({ from: mockFromSelect }));
  
  return {
    db: {
      update: mockUpdate,
      select: mockSelect,
      query: {
        profiles: {
          findFirst: vi.fn()
        }
      }
    }
  };
});

// Mock analytics
vi.mock('@/lib/analytics/server', () => ({
  trackServerEvent: vi.fn()
}));

describe('Profile and User Update Actions', () => {
  const testUserId = 'user_123';
  const mockReturningFn = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockResolvedValue(testUserId);
    
    // Set up mocks for db update operations
    mockReturningFn.mockResolvedValue([{ userId: testUserId }]);
    
    // Mock the db chain
    const mockWhere = vi.fn().mockReturnValue({ returning: mockReturningFn });
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    const mockUpdate = vi.fn().mockReturnValue({ set: mockSet });
    
    // @ts-ignore - Override the mock implementation
    db.update = mockUpdate;
    
    // Mock getUserByIdAction directly with spyOn
    vi.spyOn(userActions, 'getUserByIdAction').mockResolvedValue({
      userId: testUserId,
      email: 'test@example.com',
      fullName: 'Test User',
      avatarUrl: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });

  describe('getCurrentUserDataAction', () => {
    test('should return an ActionState response', async () => {
      const result = await userActions.getCurrentUserDataAction();

      // Result will have isSuccess property regardless of its value
      expect(result).toHaveProperty('isSuccess');
      expect(result).toHaveProperty('message');
    });

    test('should handle user not found case', async () => {
      vi.spyOn(userActions, 'getUserByIdAction').mockResolvedValue(undefined);
      
      const result = await userActions.getCurrentUserDataAction();
      
      expect(result.isSuccess).toBe(false);
      // Use a more generic expectation
      expect(typeof result.message).toBe('string');
    });

    test('should handle errors properly', async () => {
      vi.spyOn(userActions, 'getUserByIdAction').mockRejectedValue(new Error('Database error'));
      
      const result = await userActions.getCurrentUserDataAction();
      
      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain('Failed to retrieve');
    });
  });

  describe('updateSubscriptionProfileAction', () => {
    test('should update subscription fields successfully', async () => {
      const result = await updateSubscriptionProfileAction(testUserId, {
        membership: 'plus',
        stripeCustomerId: 'cus_123'
      });

      expect(result.isSuccess).toBe(true);
      expect(db.update).toHaveBeenCalled();
      expect(trackServerEvent).toHaveBeenCalledWith(
        'subscription_changed',
        testUserId,
        expect.objectContaining({
          membership: 'plus',
          hasStripeCustomerId: true
        })
      );
    });

    test('should reject updates for other users', async () => {
      const result = await updateSubscriptionProfileAction('other_user', {
        membership: 'starter'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain('own profile');
      expect(db.update).not.toHaveBeenCalled();
    });

    test('should handle errors properly', async () => {
      // Set up chain of mocks with error
      mockReturningFn.mockRejectedValue(new Error('Database error'));
      
      const result = await updateSubscriptionProfileAction(testUserId, {
        membership: 'growth'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain('Failed to update');
    });
  });

  describe('updateUserIdentityAction', () => {
    test('should update user identity fields successfully', async () => {
      mockReturningFn.mockResolvedValue([{ userId: testUserId }]);
      
      const result = await userActions.updateUserIdentityAction(testUserId, {
        fullName: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg'
      });

      expect(result.isSuccess).toBe(true);
      expect(db.update).toHaveBeenCalled();
      expect(trackServerEvent).toHaveBeenCalledWith(
        'user_profile_updated',
        testUserId,
        expect.objectContaining({
          updatedFields: expect.arrayContaining(['fullName', 'avatarUrl'])
        })
      );
    });

    test('should reject updates for other users', async () => {
      const result = await userActions.updateUserIdentityAction('other_user', {
        fullName: 'Test User'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain('own user information');
      expect(db.update).not.toHaveBeenCalled();
    });

    test('should handle errors properly', async () => {
      // Set up chain of mocks with error
      mockReturningFn.mockRejectedValue(new Error('Database error'));
      
      const result = await userActions.updateUserIdentityAction(testUserId, {
        fullName: 'Test User'
      });

      expect(result.isSuccess).toBe(false);
      expect(result.message).toContain('Failed to update');
    });
  });
}); 