import AdminLayout from '@/components/AdminLayout';
import SessionWarning from '@/components/admin/SessionWarning';
import { requireAdminServer } from '../../../api/utils';
import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function Layout({children}: Readonly<{ children: React.ReactNode }>) { 
  const user = await requireAdminServer();

  // eslint-disable-next-line react-hooks/purity
  const lastSignIn = user!.last_sign_in_at ? new Date(user!.last_sign_in_at).getTime() : Date.now();

  return (
    <AdminLayout email={user!.email}>
      <SessionWarning lastSignIn={lastSignIn} />
      {children}
    </AdminLayout>
  ); 
}
