import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { Article } from '../../src/lib/types';
import { createClient } from '../../src/utils/supabase/server';
import { validateCsrfToken, getCsrfToken as getCsrfTokenUtil } from '../../src/lib/csrf';
import { logAdminAction } from '../../src/lib/audit';
import { logger } from '../../src/lib/logger';
import { getCategories, getCities } from '../../src/lib/server-data';

export { validateCsrfToken, getCsrfTokenUtil as getCsrfToken };

export const verifyAdminAccess = cache(async () => {
  const supabaseAuth = await createClient();
  
  // Fetch user and MFA status in parallel to reduce sequential waterfall
  const [userResponse, mfaResponse] = await Promise.all([
    supabaseAuth.auth.getUser(),
    supabaseAuth.auth.mfa.getAuthenticatorAssuranceLevel()
  ]);

  const { data: { user }, error } = userResponse;
  const { data: mfaData, error: mfaError } = mfaResponse;

  if (error || user?.aud !== 'authenticated') {
    return { error: 'Unauthorized: Invalid or missing session cookie', status: 401, reason: 'InvalidSession' };
  }
  
  if (user.app_metadata?.role !== 'admin') {
    return { error: 'Forbidden: Insufficient privileges', status: 403, reason: 'AccessDenied' };
  }

  // Enforce strict 24-hour session limit
  const lastSignIn = new Date(user.last_sign_in_at || user.created_at).getTime();
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  if (Date.now() - lastSignIn > TWENTY_FOUR_HOURS) {
    return { error: 'Unauthorized: Session expired after 24 hours', status: 401, reason: 'SessionExpired' };
  }

  // MFA Verification
  if (!mfaError && mfaData) {
    const { currentLevel, nextLevel } = mfaData;
    // If nextLevel is aal2, it means the user has MFA enrolled but hasn't completed it
    if (nextLevel === 'aal2' && currentLevel !== 'aal2') {
      return { error: 'Forbidden: MFA verification required', status: 403, reason: 'MfaRequired' };
    }
  }
  
  return { error: null, user };
});

export async function requireAdmin() {
  const { error, status } = await verifyAdminAccess();
  if (error) {
    return NextResponse.json({ error }, { status });
  }
  return null;
}

export async function requireAdminServer() {
  const { error, reason, user } = await verifyAdminAccess();
  if (error) {
    redirect(`/admin/login?error=${reason}`);
  }
  return user;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hasNameConflict(supabase: { from: (table: string) => any }, table: string, name_en: string, name_gu: string): Promise<boolean> {
  const escaped = name_en.replace(/[\\%_]/g, (m) => `\\${m}`);
  const [{ data: enCheck }, { data: guCheck }] = await Promise.all([
    supabase.from(table).select('id').ilike('name_en', escaped).limit(1),
    supabase.from(table).select('id').eq('name_gu', name_gu).limit(1),
  ]);
  return Boolean((enCheck && enCheck.length > 0) || (guCheck && guCheck.length > 0));
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

type HydrateLookup = { id: number; [key: string]: unknown };

export async function hydrateArticles(
  articles: unknown,
  options: { categories?: HydrateLookup[] | null; cities?: HydrateLookup[] | null } = {}
) {
  let list = [];
  if (Array.isArray(articles)) {
    list = articles;
  } else if (articles) {
    list = [articles];
  }

  let categories: HydrateLookup[] | null | undefined = options.categories;
  let cities: HydrateLookup[] | null | undefined = options.cities;
  if (!categories || !cities) {
    const [catData, cityData] = await Promise.all([
      getCategories(),
      getCities(),
    ]);
    categories = categories || (catData as HydrateLookup[] | null);
    cities = cities || (cityData as HydrateLookup[] | null);
  }

  const catMap = Object.fromEntries((categories || []).map((c: HydrateLookup) => [c.id, c]));
  const cityMap = Object.fromEntries((cities || []).map((c: HydrateLookup) => [c.id, c]));
  return list.map((a: Record<string, unknown>) => ({
    ...a,
    category: a.category_id ? catMap[a.category_id as number] || null : null,
    city: a.city_id ? cityMap[a.city_id as number] || null : null,
  })) as unknown as Article[];
}

export function handleApiError(err: unknown) {
  logger.error('API Error', err);
  // Do not expose database internals or stack traces in responses
  if (err && typeof err === 'object' && 'code' in err && typeof (err as {code?: unknown}).code === 'string') {
    const code = (err as {code: string}).code;
    if (code === '23505') {
      return NextResponse.json({ error: 'RECORD_EXISTS' }, { status: 409 });
    }
    // Likely a Supabase/PostgREST error
    return NextResponse.json({ error: 'DATABASE_ERROR' }, { status: 500 });
  }
  // Hide all error messages to prevent internal details or stack traces from leaking
  // The full error is logged above via console.error
  return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
}

export async function requireCsrf(request: Request) {
  const valid = await validateCsrfToken(request);
  if (!valid) {
    return NextResponse.json({ error: 'CSRF token missing or invalid' }, { status: 403 });
  }
  return null;
}

export async function requireAdminMutation(request: Request) {
  const adminError = await requireAdmin();
  if (adminError) return adminError;

  const csrfError = await requireCsrf(request);
  if (csrfError) return csrfError;

  return null;
}

export async function handleAdminDelete(req: Request, tableName: string, cacheTag?: string, idKey: string = 'id') {
  const supabase = await createClient();
  try {
    const adminError = await requireAdminMutation(req);
    if (adminError) return adminError;

    const body = await req.json();
    if (!body[idKey]) return NextResponse.json({ error: `${idKey} is required` }, { status: 400 });

    const recordId = String(body[idKey]);
    
    // Fetch old data for audit log
    const { data: oldData } = await supabase.from(tableName).select('*').eq(idKey, recordId).maybeSingle();

    const { error } = await supabase.from(tableName).delete().eq(idKey, recordId);
    if (error) throw error;
    
    await logAdminAction({
      action: 'DELETE',
      table_name: tableName,
      record_id: recordId,
      old_data: oldData || undefined,
    });

    if (cacheTag) {
      (revalidateTag as (t: string) => void)(cacheTag);
    }
    if (tableName === 'articles' && oldData?.slug) {
      (revalidateTag as (t: string) => void)(`article-detail-${oldData.slug}`);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function handleAdminMutation(
  req: Request,
  tableName: string,
  operation: 'INSERT' | 'UPDATE',
  buildRow: (body: Record<string, unknown>) => Record<string, unknown>,
  cacheTag?: string,
  idKey: string = 'id'
) {
  const supabase = await createClient();
  try {
    const adminError = await requireAdminMutation(req);
    if (adminError) return adminError;

    const body = await req.json();
    const row = buildRow(body);

    let recordId: string;
    let oldData: Record<string, unknown> | null = null;

    if (operation === 'UPDATE') {
      recordId = String(body[idKey]);
      if (!recordId) return NextResponse.json({ error: `${idKey} is required` }, { status: 400 });
      const { data } = await supabase.from(tableName).select('*').eq(idKey, recordId).maybeSingle();
      oldData = data || null;
      const { data: newData, error } = await supabase.from(tableName).update(row).eq(idKey, recordId).select().single();
      if (error) throw error;
      
      await logAdminAction({
        action: 'UPDATE',
        table_name: tableName,
        record_id: recordId,
        old_data: oldData || undefined,
        new_data: newData || undefined,
      });
      
      if (cacheTag) (revalidateTag as (t: string) => void)(cacheTag);
      return NextResponse.json(newData);
    } else {
      const { data, error } = await supabase.from(tableName).insert(row).select().single();
      if (error) throw error;
      
      recordId = String(data[idKey]);
      await logAdminAction({
        action: 'CREATE',
        table_name: tableName,
        record_id: recordId,
        new_data: data || undefined,
      });
      
      if (cacheTag) (revalidateTag as (t: string) => void)(cacheTag);
      return NextResponse.json(data, { status: 201 });
    }
  } catch (err) {
    return handleApiError(err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkCrossTableConflicts(supabase: any, crossTable: string, slug?: string, name_en?: string, name_gu?: string) {
  if (slug) {
    const { data: slugCheck } = await supabase.from(crossTable).select('id').eq('slug', slug).limit(1);
    if (slugCheck && slugCheck.length > 0) {
      return NextResponse.json({ error: `SLUG_EXISTS_IN_${crossTable.toUpperCase()}` }, { status: 400 });
    }
  }
  if (name_en && name_gu) {
    if (await hasNameConflict(supabase, crossTable, name_en, name_gu)) {
      return NextResponse.json({ error: `NAME_EXISTS_IN_${crossTable.toUpperCase()}` }, { status: 400 });
    }
  }
  return null;
}
