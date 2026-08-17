import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import supabasePublic from '../../src/lib/supabase';
import type { Article } from '../../src/lib/types';
import { createClient } from '../../src/utils/supabase/server';

export async function requireAdmin() {
  const supabaseAuth = await createClient();
  const { data: { user }, error } = await supabaseAuth.auth.getUser();

  if (error || user?.aud !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized: Invalid or missing session cookie' }, { status: 401 });
  }
  
  if (user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: Insufficient privileges' }, { status: 403 });
  }

  // MFA Verification
  const { data: mfaData, error: mfaError } = await supabaseAuth.auth.mfa.getAuthenticatorAssuranceLevel();
  if (!mfaError && mfaData) {
    const { currentLevel, nextLevel } = mfaData;
    // If nextLevel is aal2, it means the user has MFA enrolled but hasn't completed it
    if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
      return NextResponse.json({ error: 'Forbidden: MFA verification required' }, { status: 403 });
    }
  }
  
  return null;
}

export function parseImages(value: unknown) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

export async function hydrateArticles(articles: unknown) {
  let list = [];
  if (Array.isArray(articles)) {
    list = articles;
  } else if (articles) {
    list = [articles];
  }
  const [{ data: categories }, { data: cities }] = await Promise.all([
    supabasePublic.from('categories').select('*'),
    supabasePublic.from('cities').select('*'),
  ]);

  const catMap = Object.fromEntries((categories || []).map((c: { id: number; [key: string]: unknown }) => [c.id, c]));
  const cityMap = Object.fromEntries((cities || []).map((c: { id: number; [key: string]: unknown }) => [c.id, c]));
  return list.map((a: Record<string, unknown>) => ({
    ...a,
    category: a.category_id ? catMap[a.category_id as number] || null : null,
    city: a.city_id ? cityMap[a.city_id as number] || null : null,
  })) as unknown as Article[];
}

export function handleApiError(err: unknown) {
  console.error('API Error:', err);
  // Do not expose database internals or stack traces in responses
  if (err && typeof err === 'object' && 'code' in err && typeof (err as {code?: unknown}).code === 'string') {
    const code = (err as {code: string}).code;
    if (code === '23505') {
      return NextResponse.json({ error: 'RECORD_EXISTS' }, { status: 409 });
    }
    // Likely a Supabase/PostgREST error
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 });
  }
  const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
  return NextResponse.json({ error: msg }, { status: 500 });
}

export async function handleAdminDelete(req: Request, tableName: string, cacheTag?: string, idKey: string = 'id') {
  const supabase = await createClient();
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await req.json();
    if (!body[idKey]) return NextResponse.json({ error: `${idKey} is required` }, { status: 400 });

    const { error } = await supabase.from(tableName).delete().eq(idKey, body[idKey]);
    if (error) throw error;
    if (cacheTag) {
      (revalidateTag as (t: string) => void)(cacheTag);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

