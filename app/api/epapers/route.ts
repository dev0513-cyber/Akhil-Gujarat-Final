import { NextResponse } from 'next/server';
import { handleAdminDelete } from '../utils';
import { withApi, withAdminApi } from '../wrappers';
import { ePaperSchema } from '../../../src/lib/validation';
import { revalidateTag } from 'next/cache';

export const GET = withApi(async (req, supabase) => {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const date = searchParams.get('date');

  let query = supabase.from('epapers').select('id, title, pdf_url, thumbnail_url, published_date, created_at, updated_at');

  if (id) {
    const { data, error } = await query.eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'E-Paper not found' }, { status: 404 });
    }
    const isAdmin = req.headers.has('x-csrf-token') || req.headers.has('authorization');
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': isAdmin ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  }

  if (date) {
    query = query.eq('published_date', date);
  } else if (month && year) {
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextMonthDate = new Date(Number(year), Number(month), 1);
    const end = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    query = query.gte('published_date', start).lt('published_date', end);
  }

  query = query.order('published_date', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  
  const isAdmin = req.headers.has('x-csrf-token') || req.headers.has('authorization');
  return NextResponse.json(data || [], {
    headers: {
      'Cache-Control': isAdmin ? 'no-store' : 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
});

export const POST = withAdminApi(async (req, supabase) => {
  const body = await req.json();
  if (!body.title || !body.pdf_url || !body.published_date) {
    return NextResponse.json({ error: 'title, pdf_url, published_date required' }, { status: 400 });
  }

  const validation = ePaperSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const { data, error } = await supabase.from('epapers').insert({
    title: validation.data.title,
    pdf_url: validation.data.pdf_url,
    thumbnail_url: validation.data.thumbnail_url || '',
    published_date: validation.data.published_date,
  }).select().single();

  if (error) throw error;
  (revalidateTag as (t: string) => void)('epapers');
  return NextResponse.json(data, { status: 201 });
});

export const PUT = withAdminApi(async (req, supabase) => {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const validation = ePaperSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = validation.data.title;
  if (body.pdf_url !== undefined) patch.pdf_url = validation.data.pdf_url;
  if (body.thumbnail_url !== undefined) patch.thumbnail_url = validation.data.thumbnail_url;
  if (body.published_date !== undefined) patch.published_date = validation.data.published_date;

  const { data, error } = await supabase.from('epapers').update(patch).eq('id', body.id).select().single();
  if (error) throw error;
  (revalidateTag as (t: string) => void)('epapers');
  return NextResponse.json(data);
});

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'epapers', 'epapers');
}
