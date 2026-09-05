import Page from '@/components/admin/Login';
import { Suspense } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper flex items-center justify-center">Loading...</div>}>
      <Page />
    </Suspense>
  );
}
