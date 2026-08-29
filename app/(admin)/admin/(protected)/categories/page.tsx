import CategoriesClient from '@/components/admin/Categories';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const supabase = await createClient();
  const [_, { data: categories }] = await Promise.all([
    requireAdminServer().catch(e => { throw e; }),
    supabase.from('categories').select('*').order('sort_order', { ascending: true })
  ]);

  return <CategoriesClient initialCategories={categories || []} />;
}
