import EpapersClient from '@/components/admin/EPapers';
import { createClient } from '@/utils/supabase/server';
import { requireAdminServer } from '../../../../api/utils';

export const dynamic = 'force-dynamic';

export default async function AdminEpapersPage() {
  const supabase = await createClient();
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Fetch the current month's e-papers
  // E-papers date string format is YYYY-MM-DD
  const startStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const endStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-31`;

  const [, { data: epapers }] = await Promise.all([
    requireAdminServer().catch(e => { throw e; }),
    supabase
      .from('epapers')
      .select('id, title, published_date, pdf_url, thumbnail_url, created_at, updated_at')
      .gte('published_date', startStr)
      .lte('published_date', endStr)
  ]);

  return <EpapersClient initialEpapers={epapers || []} initialMonth={currentMonth} initialYear={currentYear} />;
}
