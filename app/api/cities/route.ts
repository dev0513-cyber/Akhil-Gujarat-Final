import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '../../../src/utils/supabase/server';
import { requireAdmin, handleApiError, handleAdminDelete, hasNameConflict } from '../utils';
import { citySchema } from '../../../src/lib/validation';

export async function GET() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from('cities').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const body = await req.json();
    if (!body.name_en || !body.name_gu || !body.slug) {
      return NextResponse.json({ error: 'name_en, name_gu and slug are required' }, { status: 400 });
    }

    const validation = citySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }
    
    const slug = String(validation.data.slug).toLowerCase().trim();

const { data: catCheck } = await supabase.from('categories').select('id').eq('slug', slug).limit(1);
    if (catCheck && catCheck.length > 0) {
      return NextResponse.json({ error: 'SLUG_EXISTS_IN_CATEGORIES' }, { status: 400 });
    }

    if (await hasNameConflict(supabase, 'categories', validation.data.name_en, validation.data.name_gu)) {
      return NextResponse.json({ error: 'NAME_EXISTS_IN_CATEGORIES' }, { status: 400 });
    }

    const { data, error } = await supabase.from('cities').insert({
      name_en: validation.data.name_en,
      name_gu: validation.data.name_gu,
      slug,
      sort_order: validation.data.sort_order ?? 0,
    }).select().single();

    if (error) throw error;
    (revalidateTag as (t: string) => void)('cities');
    return NextResponse.json(data, { status: 201 });
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

    const validation = citySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: 'Validation failed', details: validation.error.issues }, { status: 400 });
    }

    const patch: Record<string, unknown> = {};
    if (body.name_en !== undefined) patch.name_en = validation.data.name_en;
    if (body.name_gu !== undefined) patch.name_gu = validation.data.name_gu;
    if (body.slug !== undefined) {
      patch.slug = String(validation.data.slug).toLowerCase().trim();
      const { data: catCheck } = await supabase.from('categories').select('id').eq('slug', patch.slug).limit(1);
      if (catCheck && catCheck.length > 0) {
        return NextResponse.json({ error: 'SLUG_EXISTS_IN_CATEGORIES' }, { status: 400 });
      }
    }
if (body.sort_order !== undefined) patch.sort_order = validation.data.sort_order;

    if (await hasNameConflict(supabase, 'categories', validation.data.name_en, validation.data.name_gu)) {
      return NextResponse.json({ error: 'NAME_EXISTS_IN_CATEGORIES' }, { status: 400 });
    }

    const { data, error } = await supabase.from('cities').update(patch).eq('id', body.id).select().single();
    if (error) throw error;
    (revalidateTag as (t: string) => void)('cities');
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: Request) {
  return handleAdminDelete(req, 'cities', 'cities');
}

