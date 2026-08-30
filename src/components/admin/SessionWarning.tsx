"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function SessionWarning({ lastSignIn }: Readonly<{ lastSignIn: number }>) {
  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const WARNING_THRESHOLD = 5 * 60 * 1000; // 5 minutes

    const checkSession = () => {
      const now = Date.now();
      const elapsed = now - lastSignIn;
      const remaining = TWENTY_FOUR_HOURS - elapsed;

      if (remaining <= 0) {
        // Use router to redirect
        router.push('/admin/login?error=SessionExpired');
        router.refresh();
      } else if (remaining <= WARNING_THRESHOLD) {
        setShowWarning(true);
        setMinutesLeft(Math.ceil(remaining / 60000));
      } else {
        setShowWarning(false);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [lastSignIn, router]);

  if (!showWarning) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-crimson text-white px-4 py-3 flex items-center justify-center gap-3 shadow-md animate-in slide-in-from-top">
      <AlertTriangle size={20} className="shrink-0 text-white/90" />
      <p className="text-sm font-medium tracking-wide">
        <strong>Warning:</strong> Your session will expire in {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}. Please save any unsaved work immediately.
      </p>
    </div>
  );
}
