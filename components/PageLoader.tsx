import React from 'react';

/**
 * Lightweight fallback for code-split routes (React.lazy + Suspense).
 * Centered spinner and optional loading text; responsive, no external deps.
 */
export const PageLoader: React.FC = () => (
  <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 p-6">
    <div
      className="w-10 h-10 sm:w-12 sm:h-12 border-2 border-slate-200 border-t-palma-primary rounded-full animate-spin"
      aria-hidden="true"
    />
    <p className="text-xs sm:text-sm font-medium text-slate-500">Loading…</p>
  </div>
);
