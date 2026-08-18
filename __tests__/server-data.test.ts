import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
const builder: Record<string, unknown> = {};
const methods = ['select', 'eq', 'neq', 'not', 'or', 'order', 'range', 'limit', 'gte', 'lt'];
for (const method of methods) {
  builder[method] = vi.fn().mockReturnValue(builder);
}
builder.then = (resolve: (val: unknown) => void) => resolve({ data: [], error: null });

vi.mock('../src/lib/supabase', () => ({ default: { from: mockFrom } }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return {
    ...actual,
    hydrateArticles: vi.fn(async (articles: unknown) => (Array.isArray(articles) ? articles : [articles])),
  };
});

import { getArticles } from '../src/lib/server-data';

describe('getArticles day filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(builder);
  });

  it('filters published articles to the given IST day', async () => {
    await getArticles({ day: '2026-08-18' });
    expect(mockFrom).toHaveBeenCalledWith('articles');
    expect(builder.gte).toHaveBeenCalledWith('published_at', '2026-08-17T18:30:00.000Z');
    expect(builder.lt).toHaveBeenCalledWith('published_at', '2026-08-18T18:30:00.000Z');
    expect(builder.eq).toHaveBeenCalledWith('status', 'published');
  });

  it('does not apply the day filter when day is omitted', async () => {
    await getArticles({ limit: 10 });
    expect(builder.gte).not.toHaveBeenCalled();
    expect(builder.lt).not.toHaveBeenCalled();
  });
});
