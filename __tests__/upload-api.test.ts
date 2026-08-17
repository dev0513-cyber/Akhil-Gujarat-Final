import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../app/api/upload/route';
import * as utils from '../app/api/utils';

vi.mock('../app/api/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../app/api/utils')>();
  return {
    ...actual,
    requireAdmin: vi.fn(),
  };
});

vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = vi.fn().mockResolvedValue({});
    },
    PutObjectCommand: vi.fn(),
  };
});

describe('Upload API Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthorized upload', async () => {
    const req = new Request('http://localhost/api/upload', { method: 'POST' });
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }) as never);

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('rejects invalid MIME type', async () => {
    const formData = new FormData();
    const file = new File(['dummy content'], 'virus.exe', { type: 'application/x-msdownload' });
    formData.append('file', file);
    
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData
    });
    
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);

    const res = await POST(req);
    expect(res.status).toBe(415);
    
    const body = await res.json();
    expect(body.error).toContain('Unsupported Media Type');
  });

  it('rejects oversized file', async () => {
    const formData = new FormData();
    // Simulate a 4MB file (limit is 3MB)
    const largeContent = new Uint8Array(4 * 1024 * 1024);
    const file = new File([largeContent], 'huge.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData
    });
    
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);

    const res = await POST(req);
    expect(res.status).toBe(413);
    
    const body = await res.json();
    expect(body.error).toContain('File exceeds limit: 3MB');
  });

  it('accepts valid supported image', async () => {
    const formData = new FormData();
    const file = new File(['tiny'], 'test.jpg', { type: 'image/jpeg' });
    formData.append('file', file);
    
    const req = new Request('http://localhost/api/upload', {
      method: 'POST',
      body: formData
    });
    
    vi.mocked(utils.requireAdmin).mockResolvedValueOnce(null);
    
    const res = await POST(req);
    expect(res.status).toBe(201);
    
    const body = await res.json();
    expect(body.url).toMatch(/^\/api\/media\//);
  });
});
