import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '../../../src/utils/supabase/server';
import { requireAdminMutation, handleApiError, handleAdminDelete, hasNameConflict } from '../utils';
import { categorySchema } from '../../../src/lib/validation';

export async function GET() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from('categories').select('id, name_en, name_gu, slug, sort_order, description').order('sort_order', { ascending: true });
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
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'categories', 'categories');
}

