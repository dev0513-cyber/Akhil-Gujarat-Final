'use client';

import { AlertCircle } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="p-8 bg-white border border-red-200 rounded max-w-2xl mx-auto mt-10">
      <div className="flex items-center gap-3 text-red-600 mb-4">
        <AlertCircle size={24} />
        <h2 className="text-xl font-bold">Admin Dashboard Error</h2>
      </div>
      <p className="text-ink/70 mb-6">
        An unexpected error occurred while loading this admin view.
      </p>
      <div className="bg-slate-50 p-4 rounded text-sm text-slate-700 font-mono mb-6 overflow-auto">
        {error.message || 'Unknown error'}
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-slate-900 text-white font-semibold rounded hover:bg-slate-800 transition-colors"
      >
        Retry
      </button>
    </div>
  );
}
