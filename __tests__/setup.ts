
import { vi } from 'vitest';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
process.env.UPSTASH_REDIS_REST_URL = 'https://example.com';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock server-only to prevent it from throwing in Vitest Node environment
vi.mock('server-only', () => ({}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  unstable_cache: vi.fn((fn) => fn),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(),
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// Polyfill for NextResponse if needed
import { NextResponse } from 'next/server';
(globalThis as unknown as { NextResponse: unknown }).NextResponse = NextResponse;
