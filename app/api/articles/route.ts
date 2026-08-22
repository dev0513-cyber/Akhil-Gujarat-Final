import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '../../../src/utils/supabase/server';
import { requireAdminMutation, hydrateArticles, handleApiError, handleAdminDelete } from '../utils';
import { articleSchema, paginationSchema } from '../../../src/lib/validation';
import { applyArticleSearchAndOrder } from '../../../src/lib/query-utils';


function buildArticleRow(body: Record<string, unknown>, isCreate: boolean, existingStatus?: string | null) {
  const status = body.status || 'draft';
  const now = new Date().toISOString();

  // The server is the sole authority on publish time.
  // - create: published → now, otherwise null
  // - update: only a transition INTO published stamps a fresh time;
  //   plain edits and moves out of published preserve the DB value (omit the key)
  let preservePublishTime = false;
  let publishedAt: string | null = null;
  if (isCreate) {
    publishedAt = status === 'published' ? now : null;
  } else if (status === 'published' && existingStatus !== 'published') {
    publishedAt = now;
  } else {
    preservePublishTime = true;
  }

  const row: Record<string, unknown> = {
    headline: body.headline,
    description: body.description,
    content: body.content,
    image_url: body.image_url || '',
    extra_images: body.extra_images || [],
    category_id: Number(body.category_id),
    city_id: body.city_id ? Number(body.city_id) : null,
    tags: body.tags || '',
    source: body.source || '',
    seo_title: body.seo_title || body.headline,
    seo_description: body.seo_description || body.description,
    slug: String(body.slug).toLowerCase().trim().replace(/\s+/g, '-'),
    video_url: body.video_url || '',
    status,
    is_trending: Boolean(body.is_trending),
    author: body.author || 'અખિલ ગુજરાત ડેસ્ક',
  };

  if (!preservePublishTime) {
    row.published_at = publishedAt;
  }

  if (isCreate) {
    row.created_at = now;
    row.updated_at = now;
  }

  return row;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchSingleArticle(supabase: any, id: string | null, slug: string | null, req: Request) {
  let query = supabase.from('articles').select('id, headline, description, content, image_url, extra_images, video_url, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, author, source, tags, seo_title, seo_description');
  if (id) query = query.eq('id', id);
  else query = query.eq('slug', slug);
  
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return NextResponse.json({ error: 'Article not found' }, { status: 404 });

  if (data.status !== 'published') {
const adminError = await requireAdminMutation(req);
    if (adminError) return adminError;
  }

  const [hydrated] = await hydrateArticles(data);
  return NextResponse.json(hydrated);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyBooleanFilters(query: any, trending: string | null, video: string | null, related: string | null) {
  if (trending === '1' || trending === 'true') query = query.eq('is_trending', true);
  if (video === '1' || video === 'true') query = query.not('video_url', 'is', null).neq('video_url', '');
  if (related) query = query.neq('id', related);
  return query;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildListQuery(supabase: any, searchParams: URLSearchParams, req: Request) {
  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const city = searchParams.get('city');
  const trending = searchParams.get('trending');
  const video = searchParams.get('video');
  const q = searchParams.get('q');
  const related = searchParams.get('related');

  let query = supabase.from('articles').select('id, headline, description, image_url, extra_images, video_url, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, author');

  if (status === 'all') {
    const adminError = await requireAdminMutation(req);
    if (adminError) return { error: adminError };
  } else if (status) {
    query = query.eq('status', status);
  } else {
    query = query.eq('status', 'published');
  }

  if (category) {
    const { data: cat } = await supabase.from('categories').select('id').eq('slug', category).maybeSingle();
    if (cat) query = query.eq('category_id', cat.id);
    else return { empty: true };
  }

  if (city) {
    const { data: cty } = await supabase.from('cities').select('id').eq('slug', city).maybeSingle();
    if (cty) query = query.eq('city_id', cty.id);
    else return { empty: true };
  }

  query = applyBooleanFilters(query, trending, video, related);
  query = applyArticleSearchAndOrder(query, q);
  return { query };
}

export async function GET(req: Request) {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const id = searchParams.get('id');

    if (slug || id) {
      return await fetchSingleArticle(supabase, id, slug, req);
    }
    
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    
    const pag = paginationSchema.safeParse({ 
      page: pageParam ? Number(pageParam) : undefined, 
      limit: limitParam ? Number(limitParam) : undefined 
    });
    
    const page = pag.success ? pag.data.page : 1;
    const limit = pag.success ? pag.data.limit : 20;

    const { query, empty, error: filterErr } = await buildListQuery(supabase, searchParams, req);
    if (filterErr) return filterErr;
    if (empty) return NextResponse.json([]);

    const offset = (page - 1) * limit;
    const finalQuery = query.range(offset, offset + limit - 1);

    const { data, error } = await finalQuery;
    if (error) throw error;
    const hydrated = await hydrateArticles(data || []);
    return NextResponse.json(hydrated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  try {
const adminError = await requireAdminMutation(req);
    if (adminError) return adminError;

    const body = await req.json();

    const validation = articleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }

    const row = buildArticleRow(validation.data, true, null);
    const { data, error } = await supabase.from('articles').insert(row).select().single();
    if (error) throw error;
    
    const [hydrated] = await hydrateArticles(data);
    (revalidateTag as (t: string) => void)('articles');
    return NextResponse.json(hydrated, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  try {
const adminError = await requireAdminMutation(req);
    if (adminError) return adminError;

    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const validation = articleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from('articles')
      .select('status')
      .eq('id', body.id)
      .maybeSingle();

    const row = buildArticleRow(validation.data, false, existing?.status ?? null);
    row.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('articles').update(row).eq('id', body.id).select().single();
    if (error) throw error;
    
    const [hydrated] = await hydrateArticles(data);
    (revalidateTag as (t: string) => void)('articles');
    return NextResponse.json(hydrated);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'articles', 'articles');
}

