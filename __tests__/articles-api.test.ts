import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../app/api/articles/route';
import * as utils from '../app/api/utils';

vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return {
    ...actual,
    requireAdmin: vi.fn(),
    // Mock hydrateArticles so it doesn't run complex queries
    hydrateArticles: vi.fn(async (articles) => Array.isArray(articles) ? articles : [articles]),
  };
});

// A builder that can chain any method and then be awaited
const createMockBuilder = (resolvedValue: unknown) => {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'neq', 'not', 'or', 'order', 'range', 'single', 'maybeSingle', 'insert', 'update', 'delete', 'in'];
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  // Make it awaitable
  builder.then = (resolve: (val: unknown) => void) => resolve(resolvedValue);
  return builder;
};

const mockFrom = vi.fn();

vi.mock('../src/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null })
    }
  }))
}));

describe('Articles API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET (Public Article Fetching)', () => {
    it('retrieves valid article list with correct searchParams parsing', async () => {
      const req = new Request('http://localhost/api/articles?page=1&limit=5');
      
      const builder = createMockBuilder({ data: [{ id: 1, headline: 'Test' }], error: null });
      mockFrom.mockReturnValue(builder);

      const res = await GET(req);
      expect(res.status).toBe(200);
      
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
      expect(builder.range).toHaveBeenCalledWith(0, 4); // limit 5
    });

    it('returns 404 for missing article slug', async () => {
      const req = new Request('http://localhost/api/articles?slug=non-existent');
      
      const builder = createMockBuilder({ data: null, error: null });
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      mockFrom.mockReturnValue(builder);

      const res = await GET(req);
      expect(res.status).toBe(404);
    });
  });

  describe('POST (Article Mutations)', () => {
    it('rejects unauthorized mutation', async () => {
      const req = new Request('http://localhost/api/articles', { method: 'POST' });
      
      vi.mocked(utils.requireAdmin).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never);

      const res = await POST(req);
      expect(res.status).toBe(401);
      
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('rejects request with missing required fields', async () => {
      const req = new Request('http://localhost/api/articles', {
        method: 'POST',
        body: JSON.stringify({ headline: 'Missing other fields' })
      });
      
      vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('accepts authorized admin mutation with valid payload', async () => {
      const validPayload = {
        headline: 'Admin Post',
        description: 'Test',
        content: '<p>test</p>',
        image_url: 'http://test.jpg',
        slug: 'admin-post',
        category_id: 1,
      };
      const req = new Request('http://localhost/api/articles', {
        method: 'POST',
        body: JSON.stringify(validPayload)
      });
      
      vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);

      const builder = createMockBuilder({ data: { id: 10, ...validPayload }, error: null });
      builder.single = vi.fn().mockResolvedValue({ data: { id: 10, ...validPayload }, error: null });
      mockFrom.mockReturnValue(builder);

      const res = await POST(req);
      expect(res.status).toBe(201);
      
      const body = await res.json();
      expect(body.headline).toBe('Admin Post');
    });
  });
});
