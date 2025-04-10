import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the server-only marker
vi.mock('server-only', () => ({}));

// Mock auth utils
vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn()
}));

// Mock server actions
vi.mock('@/actions/db/profiles-actions', () => ({
  getProfileByUserIdAction: vi.fn()
}));

vi.mock('@/actions/db/user-usage-actions', () => ({
  checkUserQuotaAction: vi.fn(),
  incrementPagesProcessedAction: vi.fn()
}));

// Mock rate limiting
vi.mock('@/lib/rate-limiting/limiter', () => ({
  checkRateLimit: vi.fn(),
  SubscriptionTier: {
    starter: 'starter',
    plus: 'plus',
    growth: 'growth'
  }
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn()
}));

// Mock analytics
vi.mock('@/lib/analytics/server', () => ({
  trackServerEvent: vi.fn()
}));

// Mock Next.js
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

// Mock db
vi.mock('@/db/db', () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn()
  }
}));

// Import after mocks
import { uploadDocumentAction } from '@/actions/db/documents';
import { getProfileByUserIdAction } from '@/actions/db/profiles-actions';
import { checkUserQuotaAction, incrementPagesProcessedAction } from '@/actions/db/user-usage-actions';
import { db } from '@/db/db';
import { trackServerEvent } from '@/lib/analytics/server';
import { getCurrentUser } from '@/lib/auth-utils';
import { checkRateLimit } from '@/lib/rate-limiting/limiter';
import { createServerClient } from '@/lib/supabase/server';

// Define type for error variant of ActionState for testing
type ErrorActionState = { isSuccess: false; message: string; error?: string; data?: never };

describe('Document Upload Action', () => {
  // Sample test data
  const testUserId = 'user_123';
  const testFile = new File(['test file content'], 'test.pdf', { type: 'application/pdf' });
  const testPageCount = 5;
  const mockDocumentId = 'doc_123';
  
  // Mock response objects
  const mockProfile = {
    userId: testUserId,
    membership: 'plus',
    stripeCustomerId: 'cus_123'
  };
  
  const mockRateLimitSuccess = {
    success: true,
    limit: 10,
    remaining: 9,
    reset: Date.now() + 60000
  };
  
  const mockQuotaSuccess = {
    hasQuota: true,
    remaining: 100,
    usage: {
      id: 'usage_123',
      userId: testUserId,
      pagesProcessed: 50,
      pagesLimit: 150,
      billingPeriodStart: new Date(),
      billingPeriodEnd: new Date()
    }
  };
  
  const mockDocument = {
    id: mockDocumentId,
    userId: testUserId,
    originalFilename: 'test.pdf',
    storagePath: `${testUserId}/test.pdf`,
    mimeType: 'application/pdf',
    fileSize: testFile.size,
    pageCount: testPageCount,
    status: 'uploaded',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockSupabaseStorage = {
    from: vi.fn().mockReturnThis(),
    upload: vi.fn().mockResolvedValue({ error: null })
  };
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default successful mocks
    (getCurrentUser as any).mockResolvedValue(testUserId);
    
    (getProfileByUserIdAction as any).mockResolvedValue({
      isSuccess: true,
      message: 'Profile retrieved',
      data: mockProfile
    });
    
    (checkRateLimit as any).mockResolvedValue(mockRateLimitSuccess);
    
    (checkUserQuotaAction as any).mockResolvedValue({
      isSuccess: true,
      message: 'User has sufficient quota',
      data: mockQuotaSuccess
    });
    
    (createServerClient as any).mockReturnValue({
      storage: mockSupabaseStorage
    });
    
    (db.insert as any).mockImplementation(() => ({
      values: () => ({
        returning: () => [mockDocument]
      })
    }));
    
    (incrementPagesProcessedAction as any).mockResolvedValue({
      isSuccess: true,
      message: 'Pages incremented'
    });
    
    (trackServerEvent as any).mockResolvedValue(undefined);
    (revalidatePath as any).mockReturnValue(undefined);
    (redirect as any).mockImplementation(() => { throw new Error('Redirect'); });
  });
  
  it('should upload document successfully with valid inputs', async () => {
    try {
      await uploadDocumentAction(testFile, testPageCount);
    } catch (error) {
      // Redirect throws an error, which we catch here
      expect((error as Error).message).toBe('Redirect');
    }
    
    // Verify all steps were called with correct params
    expect(getCurrentUser).toHaveBeenCalled();
    expect(getProfileByUserIdAction).toHaveBeenCalledWith(testUserId);
    expect(checkRateLimit).toHaveBeenCalledWith(testUserId, 'plus', 'document_upload');
    expect(checkUserQuotaAction).toHaveBeenCalledWith(testUserId, testPageCount);
    expect(mockSupabaseStorage.from).toHaveBeenCalledWith('documents');
    expect(mockSupabaseStorage.upload).toHaveBeenCalled();
    expect(incrementPagesProcessedAction).toHaveBeenCalledWith(testUserId, testPageCount);
    expect(trackServerEvent).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/dashboard/documents');
    expect(redirect).toHaveBeenCalledWith(`/dashboard/documents/${mockDocumentId}`);
  });
  
  it('should return error when user is not authenticated', async () => {
    (getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'));
    
    const result = await uploadDocumentAction(testFile, testPageCount) as ErrorActionState;
    
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe('Unauthorized');
    expect(result.error).toBe('500');
    
    // Verify subsequent steps were not called
    expect(getProfileByUserIdAction).not.toHaveBeenCalled();
    expect(trackServerEvent).not.toHaveBeenCalled();
  });
  
  it('should return error when profile is not found', async () => {
    (getProfileByUserIdAction as any).mockResolvedValue({
      isSuccess: false,
      message: 'Profile not found'
    });
    
    const result = await uploadDocumentAction(testFile, testPageCount) as ErrorActionState;
    
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe('Failed to get user profile');
    expect(result.error).toBe('404');
    
    // Verify subsequent steps were not called
    expect(checkRateLimit).not.toHaveBeenCalled();
  });
  
  it('should return error when rate limit is exceeded', async () => {
    (checkRateLimit as any).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now() + 60000
    });
    
    const result = await uploadDocumentAction(testFile, testPageCount) as ErrorActionState;
    
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe('Rate limit exceeded');
    expect(result.error).toBe('429');
    
    // Verify subsequent steps were not called
    expect(checkUserQuotaAction).not.toHaveBeenCalled();
  });
  
  it('should return error when user quota is exceeded', async () => {
    (checkUserQuotaAction as any).mockResolvedValue({
      isSuccess: true,
      message: 'Quota exceeded',
      data: {
        hasQuota: false,
        remaining: 0
      }
    });
    
    const result = await uploadDocumentAction(testFile, testPageCount) as ErrorActionState;
    
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe('Page quota exceeded');
    expect(result.error).toBe('403');
    
    // Verify subsequent steps were not called
    expect(createServerClient).not.toHaveBeenCalled();
  });
  
  it('should return error when file upload fails', async () => {
    (mockSupabaseStorage.upload as any).mockResolvedValue({
      error: { message: 'Storage error' }
    });
    
    const result = await uploadDocumentAction(testFile, testPageCount) as ErrorActionState;
    
    expect(result.isSuccess).toBe(false);
    expect(result.message).toBe('Failed to upload file');
    expect(result.error).toBe('Storage error');
    
    // Verify subsequent steps were not called
    expect(db.insert).not.toHaveBeenCalled();
  });
}); 