// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyArticleSearchAndOrder(query: any, q?: string | string[] | null) {
  if (q) {
    const terms = Array.isArray(q) ? q : [q];
    const orConditions: string[] = [];
    for (const termRaw of terms) {
      if (!termRaw.trim()) continue;
      const term = `%${termRaw.trim()}%`;
      orConditions.push(`headline.ilike.${term}`, `description.ilike.${term}`, `tags.ilike.${term}`, `seo_title.ilike.${term}`);
    }
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
  }
  return query.order('published_at', { ascending: false, nullsFirst: false }).order('id', { ascending: false });
}
