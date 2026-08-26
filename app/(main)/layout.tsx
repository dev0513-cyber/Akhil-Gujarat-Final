import Layout from '@/components/Layout';
import { getCategories, getCities, getSettings } from '@/lib/server-data';

export default async function MainLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [categories, cities, settings] = await Promise.all([
    getCategories(),
    getCities(),
    getSettings(),
  ]);

  return (
    <Layout
      initialCategories={categories}
      initialCities={cities}
      initialSettings={settings}
    >
      {children}
    </Layout>
  );
}