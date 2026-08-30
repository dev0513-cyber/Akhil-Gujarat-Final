import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { handleAdminDelete, checkCrossTableConflicts, validateAdminTableRequest } from '../utils';
import { withApi, withAdminApi } from '../wrappers';
import { categorySchema } from '../../../src/lib/validation';

export const GET = withApi(async (req, supabase) => {
  const { data, error } = await supabase.from('categories').select('id, name_en, name_gu, slug, sort_order, description').order('sort_order', { ascending: true });
  if (error) throw error;
  return NextResponse.json(data || []);
});

export const POST = withAdminApi(async (req, supabase) => {
  const { errorResponse, validationData } = await validateAdminTableRequest(req, categorySchema, true);
  if (errorResponse) return errorResponse;
  
  const slug = String(validationData!.slug).toLowerCase().trim();

  const conflict = await checkCrossTableConflicts(supabase, 'cities', slug, validationData!.name_en, validationData!.name_gu);
  if (conflict) return conflict;

  const { data, error } = await supabase.from('categories').insert({
    name_en: validationData!.name_en,
    name_gu: validationData!.name_gu,
    slug,
    sort_order: validationData!.sort_order ?? 0,
    description: validationData!.description || '',
  }).select().single();

  if (error) throw error;
  (revalidateTag as (t: string) => void)('categories');
  return NextResponse.json(data, { status: 201 });
});

export const PUT = withAdminApi(async (req, supabase) => {
  const { errorResponse, body, validationData } = await validateAdminTableRequest(req, categorySchema, false);
  if (errorResponse) return errorResponse;

  const patch: Record<string, unknown> = {};
  if (body.name_en !== undefined) patch.name_en = validationData!.name_en;
  if (body.name_gu !== undefined) patch.name_gu = validationData!.name_gu;
  if (body.slug !== undefined) {
    patch.slug = String(validationData!.slug).toLowerCase().trim();
  }
  if (body.sort_order !== undefined) patch.sort_order = validationData!.sort_order;
  if (body.description !== undefined) patch.description = validationData!.description;

  const conflict = await checkCrossTableConflicts(supabase, 'cities', patch.slug as string | undefined, validationData!.name_en, validationData!.name_gu);
  if (conflict) return conflict;

  const { data, error } = await supabase.from('categories').update(patch).eq('id', body.id).select().single();
  if (error) throw error;
  (revalidateTag as (t: string) => void)('categories');
  return NextResponse.json(data);
});

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'categories', 'categories');
}
