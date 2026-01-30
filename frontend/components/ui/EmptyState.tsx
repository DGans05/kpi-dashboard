'use client';

import type { ReactNode } from 'react';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-slate-800/50 p-4 mb-4">
        {icon || <FileQuestion className="h-8 w-8 text-slate-500" />}
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-slate-500 max-w-sm">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
