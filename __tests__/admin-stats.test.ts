import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../app/api/admin/stats/route';
import * as utils from '../app/api/utils';

vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

import { createMockBuilder } from './utils/mock-builder';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock('../src/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    }
  }))
}));

describe('Admin Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized access', async () => {
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never
    );

    const res = await GET();
    expect(res.status).toBe(401);
    
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns valid statistics for authenticated admins', async () => {
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);

    // We have 4 promise calls. We can just make mockFrom return different counts based on calls if we want,
    // or just return a static mock that has `.count = 10`
    const builder = createMockBuilder({ data: null, error: null, count: 15 });
    mockFrom.mockReturnValue(builder);

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.published).toBe(15);
    expect(body.drafts).toBe(15);
    expect(body.archived).toBe(15);
    expect(body.videos).toBe(15);
    
    // Verify it called from('articles') 4 times
    expect(mockFrom).toHaveBeenCalledTimes(4);
    expect(mockFrom).toHaveBeenCalledWith('articles');
  });
});
