import DashboardClient from '@/components/admin/Dashboard';
import { createClient } from '@/utils/supabase/server';
import { hydrateArticles, requireAdminServer } from '../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // Fetch Stats securely on the server
  // Wait, fetchAdminStats uses the same exact logic as the API route. Let's just implement it here to avoid the API route entirely for the initial load.
  const [
    ,
    { count: published },
    { count: drafts },
    { count: archived },
    { count: videos },
    { data: rawArticles }
  ] = await Promise.all([
    requireAdminServer().catch(e => { throw e; }),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).eq('status', 'archived'),
    supabase.from('articles').select('*', { count: 'exact', head: true }).not('video_url', 'is', null).neq('video_url', ''),
    supabase.from('articles').select('id, headline, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, author').order('created_at', { ascending: false }).limit(8)
  ]);

  const stats = {
    published: published || 0,
    drafts: drafts || 0,
    archived: archived || 0,
    videos: videos || 0,
  };

  const hydratedArticles = await hydrateArticles(rawArticles || []);

  return (
    <DashboardClient 
      initialStats={stats} 
      initialArticles={hydratedArticles} 
    />
  );
}
