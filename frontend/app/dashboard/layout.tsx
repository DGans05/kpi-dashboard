'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  Utensils,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
} from 'lucide-react';

import { useCurrentUser, useLogout } from '@/lib/hooks/useAuth';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Avatar } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems: Array<{
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
}> = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'KPI Entries', href: '/dashboard/kpi', icon: FileSpreadsheet },
  { label: 'Labour KPIs', href: '/dashboard/labour', icon: Users },
  { label: 'Food KPIs', href: '/dashboard/food', icon: Utensils },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Admin', href: '/dashboard/admin', icon: ShieldCheck, adminOnly: true },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useCurrentUser();
  const { logout, isLoading: isLoggingOut } = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const showLoadingScreen = isLoading && !user;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, router, user]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (showLoadingScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isLoading && !user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
  };

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const getPageTitle = () => {
    const item = navItems.find((i) => isActive(i.href));
    if (item) return item.label;
    if (isActive('/dashboard/admin')) return 'Admin';
    return 'Dashboard';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-lg font-bold">K</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">KPI Dashboard</span>
            <span className="text-xs text-muted-foreground">Restaurant analytics</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <div className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Menu
          </div>
          {navItems
            .filter((item) => !item.adminOnly || user?.role === 'admin')
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {active && <ChevronRight className="ml-auto h-4 w-4" />}
                </Link>
              );
            })}
        </nav>

        {/* User section */}
        <div className="border-t border-sidebar-border p-3">
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
            <Avatar
              alt={user?.fullName || user?.email || 'User'}
              fallback={
                (user?.fullName ?? user?.email ?? 'U')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
              }
              size="sm"
            />
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                {user?.fullName ?? user?.email?.split('@')[0] ?? 'User'}
              </p>
              <p className="truncate text-xs text-muted-foreground capitalize">
                {user?.role} • {user?.restaurant?.name ?? 'No restaurant'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="dropdown" className="flex-1" />
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex h-9 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              <span className="sr-only md:not-sr-only">
                {isLoggingOut ? '...' : 'Logout'}
              </span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-[240px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1">
            <h1 className="text-lg font-semibold text-foreground">{getPageTitle()}</h1>
            <p className="text-xs text-muted-foreground">
              {user?.restaurant?.name ?? 'All restaurants'}
            </p>
          </div>

          {/* Search (placeholder) */}
          <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground md:flex">
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-2 rounded bg-background px-1.5 py-0.5 text-xs font-medium">⌘K</kbd>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2">
            <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary" />
            </button>
            <div className="hidden md:block">
              <Avatar
                alt={user?.fullName || user?.email || 'User'}
                fallback={
                  (user?.fullName ?? user?.email ?? 'U')
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                }
                size="sm"
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
