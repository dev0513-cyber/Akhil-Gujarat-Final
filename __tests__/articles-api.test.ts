import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT } from '../app/api/articles/route';
import * as utils from '../app/api/utils';

vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return {
    ...actual,
    requireAdminMutation: vi.fn(),
    validateCsrfToken: vi.fn(),
    hydrateArticles: vi.fn(async (articles) => Array.isArray(articles) ? articles : [articles]),
  };
});

// A builder that can chain any method and then be awaited
const createMockBuilder = (resolvedValue: unknown) => {
  type ChainMock = ReturnType<typeof vi.fn>;
  const builder: Record<string, ChainMock> & {
    then: (resolve: (val: unknown) => void) => void;
  } = {} as Record<string, ChainMock> & {
    then: (resolve: (val: unknown) => void) => void;
  };
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
    function makeReq(body: Record<string, unknown>) {
      return new Request('http://localhost/api/articles', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'x-csrf-token': 'test-csrf-token' },
      });
    }

    it('rejects unauthorized mutation', async () => {
      const req = makeReq({ headline: 'Test' });
      
      vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never);
      vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);

      const res = await POST(req);
      expect(res.status).toBe(401);
      
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('rejects request with missing required fields', async () => {
      const req = makeReq({ headline: 'Missing other fields' });
      
      vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
      vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);

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
      const req = makeReq(validPayload);
      
      vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
      vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);

      const builder = createMockBuilder({ data: { id: 10, ...validPayload }, error: null });
      builder.single = vi.fn().mockResolvedValue({ data: { id: 10, ...validPayload }, error: null });
      mockFrom.mockReturnValue(builder);

      const res = await POST(req);
      expect(res.status).toBe(201);
      
      const body = await res.json();
      expect(body.headline).toBe('Admin Post');
    });
  });

  describe('Server-controlled published_at', () => {
    const validPayload = {
      headline: 'Admin Post',
      description: 'Test',
      content: '<p>test</p>',
      image_url: 'http://test.jpg',
      slug: 'admin-post',
      category_id: 1,
    };

    function makeReq(method: 'POST' | 'PUT', body: Record<string, unknown>) {
      return new Request('http://localhost/api/articles', {
        method,
        body: JSON.stringify(body),
        headers: { 'x-csrf-token': 'test-csrf-token' },
      });
    }

    it('POST published stamps server time', async () => {
      const req = makeReq('POST', { ...validPayload, status: 'published' });
      vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
      vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
      const inserted = { id: 1, ...validPayload, status: 'published' };
      const builder = createMockBuilder({ data: inserted, error: null });
      mockFrom.mockReturnValue(builder);

      const res = await POST(req);
      expect(res.status).toBe(201);

      const insertArg = builder.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(insertArg.published_at).toBeTruthy();
      expect(new Date(insertArg.published_at as string).toString()).not.toBe('Invalid Date');
    });

    it('POST draft leaves published_at null', async () => {
      const req = makeReq('POST', { ...validPayload, status: 'draft' });
      vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
      vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
      const inserted = { id: 1, ...validPayload, status: 'draft' };
      const builder = createMockBuilder({ data: inserted, error: null });
      mockFrom.mockReturnValue(builder);

      await POST(req);

      const insertArg = builder.insert.mock.calls[0][0] as Record<string, unknown>;
      expect(insertArg.published_at).toBeNull();
    });

    it('PUT draft→published stamps fresh server time', async () => {
      const req = makeReq('PUT', { ...validPayload, id: 7, status: 'published' });
      vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
      vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
      const builder = createMockBuilder({
        data: { id: 7, ...validPayload, status: 'published', published_at: '2026-08-18T10:00:00.000Z' },
        error: null,
      });
      // pre-fetch returns existing draft row
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'draft' }, error: null });
      mockFrom.mockReturnValue(builder);

      const res = await PUT(req);
      expect(res.status).toBe(200);

      const updateArg = builder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateArg.published_at).toBeTruthy();
      expect(updateArg.published_at).not.toBe('2026-08-18T10:00:00.000Z');
    });

    it('PUT published→published preserves original publish time', async () => {
      const req = makeReq('PUT', { ...validPayload, id: 7, status: 'published' });
      vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
      vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
      const builder = createMockBuilder({
        data: { id: 7, ...validPayload, status: 'published' },
        error: null,
      });
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'published' }, error: null });
      mockFrom.mockReturnValue(builder);

      await PUT(req);

      const updateArg = builder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateArg).not.toHaveProperty('published_at');
    });

    it('PUT published→draft preserves original publish time', async () => {
      const req = makeReq('PUT', { ...validPayload, id: 7, status: 'draft' });
      vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
      vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
      const builder = createMockBuilder({
        data: { id: 7, ...validPayload, status: 'draft' },
        error: null,
      });
      builder.maybeSingle = vi.fn().mockResolvedValue({ data: { status: 'published' }, error: null });
      mockFrom.mockReturnValue(builder);

      await PUT(req);

      const updateArg = builder.update.mock.calls[0][0] as Record<string, unknown>;
      expect(updateArg).not.toHaveProperty('published_at');
    });
  });
});