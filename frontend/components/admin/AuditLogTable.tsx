'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import type { AuditLog } from '@/lib/api/audit';

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  UPDATE: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  DELETE: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
};

const actionIcons: Record<string, typeof Plus> = {
  CREATE: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Pagination
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLogs = logs.slice(startIndex, startIndex + itemsPerPage);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50">
              <th className="w-8 px-2"></th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Resource</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(10)].map((_, i) => (
              <tr key={i} className="border-b border-slate-800/50">
                <td className="px-2 py-4"><div className="h-4 w-4 bg-slate-800 rounded animate-pulse" /></td>
                <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-800 rounded animate-pulse" /></td>
                <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-800 rounded animate-pulse" /></td>
                <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-800 rounded animate-pulse" /></td>
                <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-800 rounded animate-pulse" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-12 text-center">
        <p className="text-sm text-slate-500">No audit logs found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="w-8 px-2"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Action
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Resource
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Resource ID
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log, index) => {
                const isExpanded = expandedRows.has(log.id);
                const ActionIcon = actionIcons[log.action] || Pencil;
                const actionColor = actionColors[log.action] || actionColors.UPDATE;

                return (
                  <>
                    <tr
                      key={log.id}
                      className={`border-b border-slate-800/50 hover:bg-slate-900/50 transition cursor-pointer ${
                        index % 2 === 0 ? 'bg-slate-950/30' : ''
                      }`}
                      onClick={() => toggleRow(log.id)}
                    >
                      <td className="px-2 py-3 text-slate-400">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-200">
                        {log.user?.fullName || log.user?.email || log.userId.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${actionColor}`}
                        >
                          <ActionIcon className="h-3 w-3" />
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300 capitalize">
                        {log.resourceType}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400 font-mono">
                        {log.resourceId.slice(0, 8)}...
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${log.id}-details`} className="bg-slate-900/30">
                        <td colSpan={6} className="px-8 py-4">
                          <div className="space-y-3">
                            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Changes
                            </h4>
                            <pre className="rounded-lg bg-slate-950 p-4 text-xs text-slate-300 overflow-x-auto">
                              {JSON.stringify(log.changes, null, 2)}
                            </pre>
                            {log.ipAddress && (
                              <p className="text-xs text-slate-500">
                                IP: {log.ipAddress}
                              </p>
                            )}
                            {log.userAgent && (
                              <p className="text-xs text-slate-500 truncate max-w-xl">
                                Agent: {log.userAgent}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, logs.length)} of {logs.length} entries
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-xs text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
