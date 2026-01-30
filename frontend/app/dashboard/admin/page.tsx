'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Building2, FileText, Plus, X, Download } from 'lucide-react';
import { useAuthStore } from '@/lib/store/authStore';
import { useUsers, useDeleteUser } from '@/lib/hooks/useUsers';
import { useRestaurants, useDeleteRestaurant } from '@/lib/hooks/useRestaurants';
import { useAuditLogs } from '@/lib/hooks/useAudit';
import { UserTable } from '@/components/admin/UserTable';
import { UserForm } from '@/components/admin/UserForm';
import { RestaurantTable } from '@/components/admin/RestaurantTable';
import { RestaurantForm } from '@/components/admin/RestaurantForm';
import { AuditLogTable } from '@/components/admin/AuditLogTable';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getDateRange } from '@/lib/utils/date';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/api/users';
import type { Restaurant } from '@/lib/api/restaurants';

type Tab = 'users' | 'restaurants' | 'audit';

export default function AdminPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // Modal states
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [isRestaurantModalOpen, setIsRestaurantModalOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | undefined>();

  // Audit filters
  const [auditDateRange, setAuditDateRange] = useState(getDateRange(30));

  // Data fetching
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: restaurants = [], isLoading: restaurantsLoading, refetch: refetchRestaurants } = useRestaurants();
  const { data: auditLogs = [], isLoading: auditLoading } = useAuditLogs({
    startDate: auditDateRange.startDate,
    endDate: auditDateRange.endDate,
    limit: 500,
  });

  // Mutations
  const deleteUserMutation = useDeleteUser();
  const deleteRestaurantMutation = useDeleteRestaurant();

  // Redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  // User handlers
  const handleCreateUser = () => {
    setEditingUser(undefined);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    try {
      await deleteUserMutation.mutateAsync(user.id);
      refetchUsers();
    } catch (error) {
      console.error('Delete user error:', error);
    }
  };

  const handleUserFormSuccess = () => {
    setIsUserModalOpen(false);
    setEditingUser(undefined);
    refetchUsers();
  };

  // Restaurant handlers
  const handleCreateRestaurant = () => {
    setEditingRestaurant(undefined);
    setIsRestaurantModalOpen(true);
  };

  const handleEditRestaurant = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant);
    setIsRestaurantModalOpen(true);
  };

  const handleDeleteRestaurant = async (restaurant: Restaurant) => {
    try {
      await deleteRestaurantMutation.mutateAsync(restaurant.id);
      refetchRestaurants();
    } catch (error) {
      console.error('Delete restaurant error:', error);
    }
  };

  const handleRestaurantFormSuccess = () => {
    setIsRestaurantModalOpen(false);
    setEditingRestaurant(undefined);
    refetchRestaurants();
  };

  // Export audit logs
  const handleExportAuditLogs = () => {
    const headers = ['Timestamp', 'User', 'Action', 'Resource Type', 'Resource ID', 'Changes'];
    const rows = auditLogs.map((log) => [
      log.createdAt,
      log.user?.email || log.userId,
      log.action,
      log.resourceType,
      log.resourceId,
      JSON.stringify(log.changes),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${auditDateRange.startDate}-to-${auditDateRange.endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'users' as Tab, label: 'Users', icon: Users, count: users.length },
    { id: 'restaurants' as Tab, label: 'Restaurants', icon: Building2, count: restaurants.length },
    { id: 'audit' as Tab, label: 'Audit Logs', icon: FileText, count: auditLogs.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Admin Panel
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage users, restaurants, and view audit logs
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            <span
              className={cn(
                'ml-1 rounded-full px-2 py-0.5 text-xs',
                activeTab === tab.id
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-background text-muted-foreground'
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateUser}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>
          <UserTable
            users={users}
            isLoading={usersLoading}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
          />
        </div>
      )}

      {/* Restaurants Tab */}
      {activeTab === 'restaurants' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={handleCreateRestaurant}>
              <Plus className="h-4 w-4 mr-2" />
              Add Restaurant
            </Button>
          </div>
          <RestaurantTable
            restaurants={restaurants}
            isLoading={restaurantsLoading}
            onEdit={handleEditRestaurant}
            onDelete={handleDeleteRestaurant}
          />
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <Card className="p-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">From:</label>
                <input
                  type="date"
                  value={auditDateRange.startDate}
                  onChange={(e) =>
                    setAuditDateRange((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground">To:</label>
                <input
                  type="date"
                  value={auditDateRange.endDate}
                  onChange={(e) =>
                    setAuditDateRange((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                  max={new Date().toISOString().split('T')[0]}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAuditLogs}
                disabled={auditLogs.length === 0}
                className="ml-auto"
              >
                <Download className="h-3.5 w-3.5 mr-2" />
                Export CSV
              </Button>
            </div>
          </Card>
          <AuditLogTable logs={auditLogs} isLoading={auditLoading} />
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingUser ? 'Edit User' : 'New User'}
              </h2>
              <button
                onClick={() => {
                  setIsUserModalOpen(false);
                  setEditingUser(undefined);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <UserForm
              user={editingUser}
              restaurants={restaurants}
              onSuccess={handleUserFormSuccess}
              onCancel={() => {
                setIsUserModalOpen(false);
                setEditingUser(undefined);
              }}
            />
          </Card>
        </div>
      )}

      {/* Restaurant Modal */}
      {isRestaurantModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">
                {editingRestaurant ? 'Edit Restaurant' : 'New Restaurant'}
              </h2>
              <button
                onClick={() => {
                  setIsRestaurantModalOpen(false);
                  setEditingRestaurant(undefined);
                }}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <RestaurantForm
              restaurant={editingRestaurant}
              onSuccess={handleRestaurantFormSuccess}
              onCancel={() => {
                setIsRestaurantModalOpen(false);
                setEditingRestaurant(undefined);
              }}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
