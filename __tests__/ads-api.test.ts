import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PUT } from '../app/api/ads/route';
import * as utils from '../app/api/utils';

vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return { ...actual, requireAdmin: vi.fn(), requireAdminMutation: vi.fn(), validateCsrfToken: vi.fn() };
});

const createMockBuilder = (resolvedValue: unknown) => {
  const builder: Record<string, ReturnType<typeof vi.fn>> & { then?: (resolve: (val: unknown) => void) => void } = {};
  const methods = ['select', 'eq', 'order', 'limit', 'single', 'insert', 'update', 'delete', 'range'];
  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (val: unknown) => void) => resolve(resolvedValue);
  return builder;
};

const mockFrom = vi.fn();
vi.mock('../src/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({ from: mockFrom, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) } })),
}));

const validAd = { title: 'Banner', image_url: 'http://x/1.jpg', link_url: 'https://client.example.com', slot: 'article_top', frame: 'banner', is_active: true };

function makeReq(body: Record<string, unknown>) {
  return new Request('http://localhost/api/ads', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'x-csrf-token': 'test-csrf-token' },
  });
}

describe('Ads API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('GET returns ad list', async () => {
    mockFrom.mockReturnValue(createMockBuilder({ data: [{ id: '1', ...validAd }], error: null }));
    const res = await GET(new Request('http://localhost/api/ads'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].title).toBe('Banner');
  });

  it('POST rejects unauthorized', async () => {
    vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never);
    vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
    const res = await POST(makeReq(validAd));
    expect(res.status).toBe(401);
  });

  it('POST rejects invalid slot', async () => {
    vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
    vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
    const res = await POST(makeReq({ ...validAd, slot: 'bogus' }));
    expect(res.status).toBe(400);
  });

  it('POST accepts valid ad as admin', async () => {
    vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
    vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
    const builder = createMockBuilder({ data: { id: 'abc', ...validAd }, error: null });
    builder.single = vi.fn().mockResolvedValue({ data: { id: 'abc', ...validAd }, error: null });
    mockFrom.mockReturnValue(builder);
    const res = await POST(makeReq(validAd));
    expect(res.status).toBe(201);
  });

  it('PUT updates and returns ad', async () => {
    vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
    vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
    const builder = createMockBuilder({ data: { id: 'abc', ...validAd, is_active: false }, error: null });
    builder.single = vi.fn().mockResolvedValue({ data: { id: 'abc', ...validAd, is_active: false }, error: null });
    mockFrom.mockReturnValue(builder);
    const res = await PUT(new Request('http://localhost/api/ads', {
      method: 'PUT',
      body: JSON.stringify({ id: 'abc', ...validAd, is_active: false }),
      headers: { 'x-csrf-token': 'test-csrf-token' },
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.is_active).toBe(false);
  });

  it('POST rejects invalid frame', async () => {
    vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
    vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
    const res = await POST(makeReq({ ...validAd, frame: 'bogus' }));
    expect(res.status).toBe(400);
  });

  it('POST accepts blank link_url', async () => {
    vi.mocked(utils.requireAdminMutation).mockResolvedValueOnce(null);
    vi.mocked(utils.validateCsrfToken).mockResolvedValueOnce(true);
    const builder = createMockBuilder({ data: { id: 'def', ...validAd, link_url: '' }, error: null });
    builder.single = vi.fn().mockResolvedValue({ data: { id: 'def', ...validAd, link_url: '' }, error: null });
    mockFrom.mockReturnValue(builder);
    const res = await POST(makeReq({ ...validAd, link_url: '' }));
    expect(res.status).toBe(201);
  });
});