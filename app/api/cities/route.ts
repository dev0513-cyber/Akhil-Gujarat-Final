import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { handleAdminDelete, checkCrossTableConflicts, validateAdminTableRequest } from '../utils';
import { withApi, withAdminApi } from '../wrappers';
import { citySchema } from '../../../src/lib/validation';

export const GET = withApi(async (req, supabase) => {
  const { data, error } = await supabase.from('cities').select('id, name_en, name_gu, slug, sort_order').order('sort_order', { ascending: true });
  if (error) throw error;
  return NextResponse.json(data || []);
});

export const POST = withAdminApi(async (req, supabase) => {
  const { errorResponse, validationData } = await validateAdminTableRequest(req, citySchema, true);
  if (errorResponse) return errorResponse;
  
  const slug = String(validationData!.slug).toLowerCase().trim();

  const conflict = await checkCrossTableConflicts(supabase, 'categories', slug, validationData!.name_en, validationData!.name_gu);
  if (conflict) return conflict;

  const { data, error } = await supabase.from('cities').insert({
    name_en: validationData!.name_en,
    name_gu: validationData!.name_gu,
    slug,
    sort_order: validationData!.sort_order ?? 0,
  }).select().single();

  if (error) throw error;
  (revalidateTag as (t: string) => void)('cities');
  return NextResponse.json(data, { status: 201 });
});

export const PUT = withAdminApi(async (req, supabase) => {
  const { errorResponse, body, validationData } = await validateAdminTableRequest(req, citySchema, false);
  if (errorResponse) return errorResponse;

  const patch: Record<string, unknown> = {};
  if (body.name_en !== undefined) patch.name_en = validationData!.name_en;
  if (body.name_gu !== undefined) patch.name_gu = validationData!.name_gu;
  if (body.slug !== undefined) {
    patch.slug = String(validationData!.slug).toLowerCase().trim();
  }
  if (body.sort_order !== undefined) patch.sort_order = validationData!.sort_order;

  const conflict = await checkCrossTableConflicts(supabase, 'categories', patch.slug as string | undefined, validationData!.name_en, validationData!.name_gu);
  if (conflict) return conflict;

  const { data, error } = await supabase.from('cities').update(patch).eq('id', body.id).select().single();
  if (error) throw error;
  (revalidateTag as (t: string) => void)('cities');
  return NextResponse.json(data);
});

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'cities', 'cities');
}
