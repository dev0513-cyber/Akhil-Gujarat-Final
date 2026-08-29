import { NextResponse } from 'next/server';
import { requireAdminMutation } from '../../utils';
import { logger } from '../../../../src/lib/logger';
import { logAdminAction } from '../../../../src/lib/audit';

// Supabase Management API base URL
const MANAGEMENT_API_URL = `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}`;

async function getAdminToken(): Promise<string> {
  // Use the Supabase Management API to generate a short-lived admin token
  // This requires SUPABASE_ACCESS_TOKEN (personal access token) in env
  const response = await fetch(`${MANAGEMENT_API_URL}/admin/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get admin token: ${error}`);
  }

  const data = await response.json();
  return data.token; // Short-lived JWT (typically 1 hour)
}

export async function POST(req: Request) {
  const adminError = await requireAdminMutation(req);
  if (adminError) return adminError;

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Option 1: Use Management API admin token (requires SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF)
    if (process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_PROJECT_REF) {
      try {
        const adminToken = await getAdminToken();

        const response = await fetch(`${MANAGEMENT_API_URL}/auth/admin/users/${userId}/signout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Management API signout failed: ${error}`);
        }
      } catch (mgmtError) {
        logger.warn('Management API failed, falling back to service role', { error: String(mgmtError) });
        // Fall through to Option 2
      }
    }

    // Option 2: Fallback to service role (if MANAGEMENT_API not configured)
    // This requires SUPABASE_SERVICE_ROLE_KEY
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const { error } = await supabaseAdmin.auth.admin.signOut(userId);
      if (error) throw error;
    } else {
      throw new Error('Neither SUPABASE_ACCESS_TOKEN nor SUPABASE_SERVICE_ROLE_KEY configured');
    }

    await logAdminAction({
      action: 'REVOKE_SESSIONS',
      table_name: 'auth.users',
      record_id: userId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error('Session revocation error:', err);
    return NextResponse.json({ error: 'Failed to revoke sessions' }, { status: 500 });
  }
}