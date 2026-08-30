import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createMockBuilder } from './utils/mock-builder';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const builder = createMockBuilder({ data: [], error: null }) as any;

vi.mock('../src/lib/supabase', () => ({ default: { from: mockFrom } }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return {
    ...actual,
    hydrateArticles: vi.fn(async (articles: unknown) => (Array.isArray(articles) ? articles : [articles])),
  };
});

import { getAdsForSlot } from '../src/lib/server-data';

const ads = [
  { id: 'a', title: 'Ad 1', image_url: 'http://x/1.jpg', link_url: 'http://l', slot: 'article_top', is_active: true, created_at: '2026-08-19T00:00:00Z' },
  { id: 'b', title: 'Ad 2', image_url: 'http://x/2.jpg', link_url: 'http://l', slot: 'article_top', is_active: true, created_at: '2026-08-19T00:00:00Z' },
];

describe('getAdsForSlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(builder);
  });

  it('filters by slot and is_active and returns one random ad', async () => {
    builder.then = (resolve: (val: unknown) => void) => resolve({ data: ads, error: null });
    const ad = await getAdsForSlot('article_top');
    expect(mockFrom).toHaveBeenCalledWith('ads');
    expect(builder.eq).toHaveBeenCalledWith('slot', 'article_top');
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
    expect(ads).toContain(ad);
  });

  it('returns null when the slot has no active ads', async () => {
    builder.then = (resolve: (val: unknown) => void) => resolve({ data: [], error: null });
    const ad = await getAdsForSlot('article_top');
    expect(ad).toBeNull();
  });
});
