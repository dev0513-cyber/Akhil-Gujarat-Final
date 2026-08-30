import { describe, it, expect, vi, beforeEach } from 'vitest';

import { mockFrom, builder } from './utils/shared-mocks';

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
