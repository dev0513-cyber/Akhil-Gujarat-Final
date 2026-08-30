import CitiesClient from '@/components/admin/Cities';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminCitiesPage() {
  const supabase = await createClient();
  const [, { data: cities }] = await Promise.all([
    requireAdminServer().catch(e => { throw e; }),
    supabase.from('cities').select('id, name_en, name_gu, slug, sort_order').order('sort_order', { ascending: true })
  ]);

  return <CitiesClient initialCities={cities || []} />;
}
