'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="gu">
      <body>
        <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>અણધારી ભૂલ (Unexpected Error)</h2>
          <p>Please try again later.</p>
          <button onClick={() => reset()} style={{ padding: '0.5rem 1rem', marginTop: '1rem', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
