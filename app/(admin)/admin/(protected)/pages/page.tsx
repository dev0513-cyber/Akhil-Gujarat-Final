import PagesClient from '@/components/admin/Pages';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminPagesPage() {
  const supabase = await createClient();
  const [_, { data: pages }] = await Promise.all([
    requireAdminServer().catch(e => { throw e; }),
    supabase.from('static_pages').select('*').order('id', { ascending: true })
  ]);

  return <PagesClient initialPages={pages || []} />;
}
