import { beforeEach, vi } from 'vitest';

// Mock Next.js server modules
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Instead of mocking crypto directly, we'll mock the functions that use it
vi.mock('crypto', () => ({
  // Provide both named and default exports to satisfy Vitest ESM expectations
  randomUUID: () => 'test-uuid-123456',
  default: {
    randomUUID: () => 'test-uuid-123456'
  }
}));

// Mock environment variables
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis-url.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token';

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock Next.js modules that might cause issues in tests
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
  redirect: vi.fn(),
}));

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
}); 