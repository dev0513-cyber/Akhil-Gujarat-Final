import SettingsClient from '@/components/admin/Settings';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';
import type { SiteSetting } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  
  // Parallelize auth check and database fetch.
  // requireAdminServer throws a redirect exception if unauthorized, which Promise.all correctly propagates.
  const [, { data: settings }] = await Promise.all([
    requireAdminServer().catch((e) => { throw e; }),
    supabase.from('site_settings').select('key, value, description, updated_at')
  ]);

  return <SettingsClient initialSettings={(settings as SiteSetting[]) || []} />;
}
