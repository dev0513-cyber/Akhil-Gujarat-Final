import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAdmin } from '../app/api/utils';

const mockGetUser = vi.fn();
const mockGetAuthenticatorAssuranceLevel = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('../src/utils/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
      mfa: {
        getAuthenticatorAssuranceLevel: mockGetAuthenticatorAssuranceLevel
      }
    }
  }))
}));

describe('Admin Authorization (requireAdmin)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated user (missing token)', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('Missing token') });
    
    const response = await requireAdmin();
    expect(response).not.toBeNull();
    expect(response?.status).toBe(401);
    
    const body = await response?.json();
    expect(body?.error).toContain('Invalid or missing session cookie');
  });

  it('rejects authenticated non-admin user', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { aud: 'authenticated', app_metadata: { role: 'user' } } },
      error: null
    });

    const response = await requireAdmin();
    expect(response).not.toBeNull();
    expect(response?.status).toBe(403);
    
    const body = await response?.json();
    expect(body?.error).toContain('Insufficient privileges');
  });

  it('accepts verified admin user', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { aud: 'authenticated', app_metadata: { role: 'admin' } } },
      error: null
    });

    const response = await requireAdmin();
    expect(response).toBeNull(); // Return null indicates success
  });
});
