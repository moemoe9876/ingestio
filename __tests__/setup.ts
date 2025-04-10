import { vi } from 'vitest';

// Mock Next.js server modules
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Instead of mocking crypto directly, we'll mock the functions that use it
vi.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-123456'
}));

// Mock environment variables
process.env.UPSTASH_REDIS_REST_URL = 'https://test-redis-url.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-redis-token'; 