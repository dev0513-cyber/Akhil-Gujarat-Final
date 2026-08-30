import AdsClient from '@/components/admin/Ads';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAdsPage() {
  const supabase = await createClient();
  const [_, { data: ads }] = await Promise.all([
    requireAdminServer().catch(e => { throw e; }),
    supabase.from('ads').select('id, title, image_url, link_url, slot, frame, is_active, created_at, updated_at').order('created_at', { ascending: false })
  ]);

  return <AdsClient initialAds={ads || []} />;
}