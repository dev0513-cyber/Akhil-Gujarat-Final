import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { handleAdminDelete } from '../utils';
import { withApi, withAdminApi } from '../wrappers';
import { adSchema } from '../../../src/lib/validation';

export const GET = withApi(async (req, supabase) => {
  const { data, error } = await supabase.from('ads').select('id, title, image_url, link_url, slot, frame, is_active, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return NextResponse.json(data || []);
});

export const POST = withAdminApi(async (req, supabase) => {
  const body = await req.json();
  const validation = adSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const { data, error } = await supabase.from('ads').insert({
    title: validation.data.title,
    image_url: validation.data.image_url,
    link_url: validation.data.link_url,
    slot: validation.data.slot,
    frame: validation.data.frame,
    is_active: validation.data.is_active,
  }).select().single();

  if (error) throw error;
  (revalidateTag as (t: string) => void)('ads');
  return NextResponse.json(data, { status: 201 });
});

export const PUT = withAdminApi(async (req, supabase) => {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const validation = adSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
  }

  const patch = {
    title: validation.data.title,
    image_url: validation.data.image_url,
    link_url: validation.data.link_url,
    slot: validation.data.slot,
    frame: validation.data.frame,
    is_active: validation.data.is_active,
  };

  const { data, error } = await supabase.from('ads').update(patch).eq('id', body.id).select().single();
  if (error) throw error;
  (revalidateTag as (t: string) => void)('ads');
  return NextResponse.json(data);
});

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'ads', 'ads');
}
