// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyArticleSearchAndOrder(query: any, q?: string | null) {
  if (q) {
    const term = `%${q}%`;
    query = query.or(`headline.ilike.${term},description.ilike.${term},tags.ilike.${term},seo_title.ilike.${term}`);
  }
  return query.order('published_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
}
