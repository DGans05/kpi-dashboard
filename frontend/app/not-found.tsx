import Link from 'next/link';
import { FileQuestion, Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="flex justify-center mb-6">
          <div className="rounded-full bg-slate-800/50 p-4">
            <FileQuestion className="h-12 w-12 text-slate-400" />
          </div>
        </div>
        <h1 className="text-6xl font-bold text-slate-600 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-100 mb-2">
          Page Not Found
        </h2>
        <p className="text-slate-400 mb-8">
          The page you are looking for does not exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-500/40 hover:bg-indigo-400 transition"
          >
            <Home className="h-4 w-4" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => typeof window !== 'undefined' && window.history.back()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-6 py-3 text-sm font-medium text-slate-200 hover:bg-slate-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
