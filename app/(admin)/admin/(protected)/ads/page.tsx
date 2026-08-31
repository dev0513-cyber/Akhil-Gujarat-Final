import AdsClient from '@/components/admin/Ads';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAdsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}>) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 5;
  const fetchLimit = pageSize + 1; // N+1 trick to check for next page
  const from = (page - 1) * pageSize;
  const to = from + fetchLimit - 1;

  const supabase = await createClient();
  const [, { data: ads }] = await Promise.all([
    requireAdminServer().catch(e => { throw e; }),
    supabase.from('ads')
      .select('id, title, image_url, link_url, slot, frame, is_active, created_at')
      .order('created_at', { ascending: false })
      .range(from, to)
  ]);

  return <AdsClient initialAds={ads || []} initialPage={page} />;
}
