import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '../../../src/utils/supabase/server';
import { requireAdmin, handleApiError } from '../utils';
import { staticPageSchema } from '../../../src/lib/validation';

export async function GET(req: Request) {
  const supabase = await createClient();
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const { data, error } = await supabase.from('static_pages').select('*').eq('slug', slug).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'Page not found' }, { status: 404 });
      return NextResponse.json(data);
    }

    const { data, error } = await supabase.from('static_pages').select('*').order('id', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: Request) {
  const supabase = await createClient();
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const validation = staticPageSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }

    const { data, error } = await supabase.from('static_pages').update({
      title_gu: validation.data.title_gu,
      title_en: validation.data.title_en,
      content: validation.data.content,
      seo_title: validation.data.seo_title,
      seo_description: validation.data.seo_description,
      updated_at: new Date().toISOString(),
    }).eq('id', body.id).select().single();

    if (error) throw error;
    (revalidateTag as (t: string) => void)('pages');
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient();
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { error } = await supabase.from('static_pages').delete().eq('id', body.id);
    if (error) throw error;
    
    (revalidateTag as (t: string) => void)('pages');
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}


