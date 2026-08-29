'use client';

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
