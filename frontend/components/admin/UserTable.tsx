'use client';

import { useState } from 'react';
import { Pencil, Trash2, Search, Shield, User as UserIcon, Eye } from 'lucide-react';
import type { User } from '@/lib/api/users';
import { formatDate } from '@/lib/utils/formatters';

interface UserTableProps {
  users: User[];
  isLoading?: boolean;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
}

const roleColors = {
  admin: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  manager: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  viewer: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

const roleIcons = {
  admin: Shield,
  manager: UserIcon,
  viewer: Eye,
};

export function UserTable({ users, isLoading, onEdit, onDelete }: UserTableProps) {
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.fullName?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const handleDeleteClick = (user: User) => {
    setDeleteConfirm(user);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm && onDelete) {
      onDelete(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-64 bg-slate-800 rounded animate-pulse" />
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Restaurant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-slate-800/50">
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-800 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-800 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-800 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-24 bg-slate-800 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-12 bg-slate-800 rounded animate-pulse" /></td>
                  <td className="px-4 py-4"><div className="h-4 w-16 ml-auto bg-slate-800 rounded animate-pulse" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-xs pl-10 pr-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Role
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Restaurant
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    {search ? 'No users found matching your search' : 'No users found'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user, index) => {
                  const RoleIcon = roleIcons[user.role];
                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-slate-800/50 hover:bg-slate-900/50 transition ${
                        index % 2 === 0 ? 'bg-slate-950/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-slate-200">
                        {user.fullName || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${roleColors[user.role]}`}
                        >
                          <RoleIcon className="h-3 w-3" />
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-300">
                        {user.restaurant?.name || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            user.isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {onEdit && (
                            <button
                              onClick={() => onEdit(user)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
                              title="Edit user"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={() => handleDeleteClick(user)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition"
                              title="Delete user"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-100">Delete User</h3>
            <p className="mt-2 text-sm text-slate-400">
              Are you sure you want to delete <span className="font-medium text-slate-200">{deleteConfirm.email}</span>? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-400 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
