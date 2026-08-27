import AdminLayout from '@/components/AdminLayout';
import SessionWarning from '@/components/admin/SessionWarning';
import { requireAdminServer, verifyAdminAccess } from '../../../api/utils';

export default async function Layout({children}: Readonly<{ children: React.ReactNode }>) { 
  await requireAdminServer();
  const { user } = await verifyAdminAccess(); // We know user exists because requireAdminServer succeeded

  // eslint-disable-next-line react-hooks/purity
  const lastSignIn = user!.last_sign_in_at ? new Date(user!.last_sign_in_at).getTime() : Date.now();

  return (
    <AdminLayout email={user!.email}>
      <SessionWarning lastSignIn={lastSignIn} />
      {children}
    </AdminLayout>
  ); 
}
