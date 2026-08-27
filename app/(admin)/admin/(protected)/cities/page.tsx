import CitiesClient from '@/components/admin/Cities';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminCitiesPage() {
  await requireAdminServer();
  const supabase = await createClient();
  const { data: cities } = await supabase.from('cities').select('*').order('sort_order', { ascending: true });

  return <CitiesClient initialCities={cities || []} />;
}
