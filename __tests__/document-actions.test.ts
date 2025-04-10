import { randomUUID } from 'crypto';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock auth utility
vi.mock('@/lib/auth-utils', () => ({
  getCurrentUser: vi.fn()
}));

// Mock revalidatePath and redirect
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn()
}));

// Mock Supabase client
const mockRemove = vi.fn();
const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: mockSingle
          })
        })
      }),
      delete: () => ({
        eq: () => ({
          eq: mockEq
        })
      })
    })),
    storage: {
      from: vi.fn(() => ({
        remove: mockRemove
      }))
    }
  }))
}));

// Mock analytics
vi.mock('@/lib/analytics/server', () => ({
  trackServerEvent: vi.fn()
}));

// Import after mocks are set up
import { deleteDocumentAction } from '@/actions/db/documents';
import { getCurrentUser } from '@/lib/auth-utils';

describe('Document Actions', () => {
  const mockUserId = 'user_123';
  const mockDocumentId = randomUUID();
  const mockDocument = {
    id: mockDocumentId,
    user_id: mockUserId,
    original_filename: 'test.pdf',
    storage_path: `${mockUserId}/test.pdf`,
    mime_type: 'application/pdf',
    file_size: 1000,
    page_count: 2,
    status: 'uploaded'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation for getCurrentUser
    vi.mocked(getCurrentUser).mockResolvedValue(mockUserId);

    // Default mock implementations for Supabase client
    mockSingle.mockResolvedValue({ data: mockDocument, error: null });
    mockRemove.mockResolvedValue({ error: null });
    mockEq.mockResolvedValue({ error: null });
  });

  describe('deleteDocumentAction', () => {
    test('successfully deletes document and associated file', async () => {
      const result = await deleteDocumentAction(mockDocumentId);
      
      expect(result.isSuccess).toBe(true);
      expect(result.message).toBe('Document deleted successfully');
      expect(mockRemove).toHaveBeenCalledWith([mockDocument.storage_path]);
    });

    test('returns error when document not found or user does not own it', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } });
      
      const result = await deleteDocumentAction(mockDocumentId);
      
      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Document not found or access denied');
      expect((result as { isSuccess: false; message: string; error: string }).error).toBe('404');
    });

    test('continues with database deletion even if storage deletion fails', async () => {
      mockRemove.mockResolvedValueOnce({ error: { message: 'Storage error' } });
      
      const result = await deleteDocumentAction(mockDocumentId);
      
      expect(result.isSuccess).toBe(true);
      expect(result.message).toBe('Document deleted successfully');
    });

    test('returns error when database deletion fails', async () => {
      mockEq.mockResolvedValueOnce({ error: { message: 'Database error' } });
      
      const result = await deleteDocumentAction(mockDocumentId);
      
      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Failed to delete document');
      expect((result as { isSuccess: false; message: string; error: string }).error).toBe('Database error');
    });

    test('returns error when user is not authenticated', async () => {
      vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('Unauthorized'));
      
      const result = await deleteDocumentAction(mockDocumentId);
      
      expect(result.isSuccess).toBe(false);
      expect(result.message).toBe('Unauthorized');
    });
  });
}); 