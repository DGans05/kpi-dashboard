'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-rose-500/20 p-4">
            <AlertTriangle className="h-12 w-12 text-rose-400" />
          </div>
        </div>
        <h1 className="text-2xl font-semibold text-slate-100 mb-2">
          Something went wrong
        </h1>
        <p className="text-slate-400 mb-6">
          An unexpected error occurred. We apologize for the inconvenience.
        </p>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-left">
            <p className="text-xs font-mono text-rose-300 break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="mt-2 text-xs text-rose-400">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/40 hover:bg-indigo-400 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
