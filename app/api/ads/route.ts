import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '../../../src/utils/supabase/server';
import { requireAdminMutation, handleApiError, handleAdminDelete } from '../utils';
import { adSchema } from '../../../src/lib/validation';

export async function GET() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data || []);
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
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'ads', 'ads');
}
