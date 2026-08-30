import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { handleAdminDelete, hasNameConflict } from '../utils';
import { withApi, withAdminApi } from '../wrappers';
import { categorySchema } from '../../../src/lib/validation';

export const GET = withApi(async (req, supabase) => {
  const { data, error } = await supabase.from('categories').select('id, name_en, name_gu, slug, sort_order, description').order('sort_order', { ascending: true });
  if (error) throw error;
  return NextResponse.json(data || []);
});

export const POST = withAdminApi(async (req, supabase) => {
  const body = await req.json();
  if (!body.name_en || !body.name_gu || !body.slug) {
    return NextResponse.json({ error: 'name_en, name_gu and slug are required' }, { status: 400 });
  }

  const validation = categorySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }
  
  const slug = String(validation.data.slug).toLowerCase().trim();

  const { data: cityCheck } = await supabase.from('cities').select('id').eq('slug', slug).limit(1);
  if (cityCheck && cityCheck.length > 0) {
    return NextResponse.json({ error: 'SLUG_EXISTS_IN_CITIES' }, { status: 400 });
  }

  if (await hasNameConflict(supabase, 'cities', validation.data.name_en, validation.data.name_gu)) {
    return NextResponse.json({ error: 'NAME_EXISTS_IN_CITIES' }, { status: 400 });
  }

  const { data, error } = await supabase.from('categories').insert({
    name_en: validation.data.name_en,
    name_gu: validation.data.name_gu,
    slug,
    sort_order: validation.data.sort_order ?? 0,
    description: validation.data.description || '',
  }).select().single();

  if (error) throw error;
  (revalidateTag as (t: string) => void)('categories');
  return NextResponse.json(data, { status: 201 });
});

export const PUT = withAdminApi(async (req, supabase) => {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const validation = categorySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (body.name_en !== undefined) patch.name_en = validation.data.name_en;
  if (body.name_gu !== undefined) patch.name_gu = validation.data.name_gu;
  if (body.slug !== undefined) {
    patch.slug = String(validation.data.slug).toLowerCase().trim();
    const { data: cityCheck } = await supabase.from('cities').select('id').eq('slug', patch.slug).limit(1);
    if (cityCheck && cityCheck.length > 0) {
      return NextResponse.json({ error: 'SLUG_EXISTS_IN_CITIES' }, { status: 400 });
    }
  }
  if (body.sort_order !== undefined) patch.sort_order = validation.data.sort_order;
  if (body.description !== undefined) patch.description = validation.data.description;

  if (await hasNameConflict(supabase, 'cities', validation.data.name_en, validation.data.name_gu)) {
    return NextResponse.json({ error: 'NAME_EXISTS_IN_CITIES' }, { status: 400 });
  }

  const { data, error } = await supabase.from('categories').update(patch).eq('id', body.id).select().single();
  if (error) throw error;
  (revalidateTag as (t: string) => void)('categories');
  return NextResponse.json(data);
});

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'categories', 'categories');
}
