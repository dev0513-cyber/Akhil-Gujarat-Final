import { vi } from 'vitest';
import { createMockBuilder } from './mock-builder';

export const mockFrom = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const builder = createMockBuilder({ data: [], error: null }) as any;

vi.mock('../../src/lib/supabase', () => ({ default: { from: mockFrom } }));
vi.mock('../../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/api/utils')>();
  return {
    ...actual,
    hydrateArticles: vi.fn(async (articles: unknown) => (Array.isArray(articles) ? articles : [articles])),
    requireAdminMutation: vi.fn(),
    validateCsrfToken: vi.fn(),
  };
});
