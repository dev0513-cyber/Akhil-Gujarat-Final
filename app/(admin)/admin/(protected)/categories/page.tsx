import CategoriesClient from '@/components/admin/Categories';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  await requireAdminServer();
  const supabase = await createClient();
  const { data: categories } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });

  return <CategoriesClient initialCategories={categories || []} />;
}
