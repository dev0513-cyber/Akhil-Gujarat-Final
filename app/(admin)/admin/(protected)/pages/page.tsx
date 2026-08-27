import PagesClient from '@/components/admin/Pages';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminPagesPage() {
  await requireAdminServer();
  const supabase = await createClient();
  const { data: pages } = await supabase.from('static_pages').select('*').order('id', { ascending: true });

  return <PagesClient initialPages={pages || []} />;
}
