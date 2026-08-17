import { NextResponse } from 'next/server';
import { createClient } from '../../../src/utils/supabase/server';
import { requireAdmin, handleApiError } from '../utils';

export async function GET() {
  const supabase = await createClient();
  try {
    const { data, error } = await supabase.from('site_settings').select('*');
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
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Body must be an object of key-value pairs' }, { status: 400 });
    }

    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string') {
        return NextResponse.json({ error: `Value for ${key} must be a string` }, { status: 400 });
      }
    }

    const promises = Object.entries(body).map(async ([key, value]) => {
      const { data: existing } = await supabase.from('site_settings').select('id').eq('key', key).maybeSingle();
      if (existing) {
        return supabase.from('site_settings').update({ value: String(value) }).eq('key', key);
      }
      return supabase.from('site_settings').insert({ key, value: String(value) });
    });

    await Promise.all(promises);

    const { data, error } = await supabase.from('site_settings').select('*');
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return handleApiError(err);
  }
}


