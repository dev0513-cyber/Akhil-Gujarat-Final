import { NextResponse } from 'next/server';
import { createClient } from '../../../../src/utils/supabase/server';
import { requireAdmin } from '../../utils';

export async function GET() {
  try {
    const adminError = await requireAdmin();
    if (adminError) return adminError;

    const supabase = await createClient();

    const [pub, draft, arch, vid] = await Promise.all([
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('articles').select('id', { count: 'exact', head: true }).eq('status', 'archived'),
      supabase.from('articles').select('id', { count: 'exact', head: true }).not('video_url', 'is', null).neq('video_url', ''),
    ]);

    // Supabase returns count in the `count` property
    return NextResponse.json({
      published: pub.count || 0,
      drafts: draft.count || 0,
      archived: arch.count || 0,
      videos: vid.count || 0,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 });
  }
}
