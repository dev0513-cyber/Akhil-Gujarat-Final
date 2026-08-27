import AdsClient from '@/components/admin/Ads';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminAdsPage() {
  await requireAdminServer();
  const supabase = await createClient();
  const { data: ads } = await supabase.from('ads').select('*').order('created_at', { ascending: false });

  return <AdsClient initialAds={ads || []} />;
}