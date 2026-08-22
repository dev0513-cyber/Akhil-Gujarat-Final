import AdminLayout from '@/components/AdminLayout';
import SessionWarning from '@/components/admin/SessionWarning';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function Layout({children}: Readonly<{ children: React.ReactNode }>) { 
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/admin/login');
  }

  const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : Date.now();

  return (
    <AdminLayout email={user.email}>
      <SessionWarning lastSignIn={lastSignIn} />
      {children}
    </AdminLayout>
  ); 
}
