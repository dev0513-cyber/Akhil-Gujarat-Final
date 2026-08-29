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
  const params = await searchParams;
  const status = params.status as string || 'all';
  const q = params.q as string || '';
  
  const supabase = await createClient();

  let query = supabase.from('articles').select('id, headline, category_id, city_id, published_at, created_at, updated_at, status, is_trending, slug, author');

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  query = applyArticleSearchAndOrder(query, q);

  const page = Number(params.page) || 1;
  const pageSize = 20;
  const fetchLimit = pageSize + 1; // N+1 trick to check for next page
  const from = (page - 1) * pageSize;
  const to = from + fetchLimit - 1;

  query = query.range(from, to);

  const [_, { data: rawArticles }] = await Promise.all([
    requireAdminServer().catch(e => { throw e; }),
    query
  ]);

  const hydratedArticles = await hydrateArticles(rawArticles || []);

  return (
    <ArticlesClient 
      initialArticles={hydratedArticles} 
      initialStatus={status}
      initialSearch={q}
      initialPage={page}
    />
  );
}
