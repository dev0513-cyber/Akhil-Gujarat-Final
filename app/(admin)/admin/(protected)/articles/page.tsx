import ArticlesClient from '@/components/admin/Articles';
import { createClient } from '@/utils/supabase/server';
import { hydrateArticles } from '../../../../api/utils';
import { requireAdminServer } from '../../../../api/utils';
import { applyArticleSearchAndOrder } from '@/lib/query-utils';

export const dynamic = 'force-dynamic';

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  await requireAdminServer();
  const params = await searchParams;
  const status = params.status as string || 'all';
  const q = params.q as string || '';
  
  const supabase = await createClient();

  let query = supabase.from('articles').select('id, headline, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, author');

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  query = applyArticleSearchAndOrder(query, q);

  // For scalable admin, we should limit to 100 for now or implement real pagination. The old UI did 100 max.
  query = query.limit(100);

  const [{ data: rawArticles }] = await Promise.all([
    query
  ]);

  const hydratedArticles = await hydrateArticles(rawArticles || []);

  return (
    <ArticlesClient 
      initialArticles={hydratedArticles} 
      initialStatus={status}
      initialSearch={q}
    />
  );
}
