'use client';

import { useEffect } from 'react';

export default function ErrorBoundary({
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
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <h2 className="text-2xl font-bold mb-4 font-display text-ink">ક્ષમા કરશો, કંઈક ખોટું થયું. (Something went wrong)</h2>
      <p className="text-ink/70 mb-6 max-w-md font-gujarati">
        અમને એક અણધારી ભૂલ આવી છે. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 bg-crimson text-white font-semibold rounded hover:bg-red-700 transition-colors"
      >
        ફરી પ્રયાસ કરો (Try again)
      </button>
    </div>
  );
}
