import SettingsClient from '@/components/admin/Settings';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';
import type { SiteSetting } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdminServer();
  const supabase = await createClient();
  const { data: settings } = await supabase.from('site_settings').select('*');

  return <SettingsClient initialSettings={(settings as SiteSetting[]) || []} />;
}
