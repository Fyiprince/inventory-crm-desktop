import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Tag, Truck, FolderKanban, ArrowDownToLine,
  ArrowUpFromLine, Warehouse, ScrollText, BarChart3, Settings as SettingsIcon,
  DatabaseBackup, Menu, ChevronLeft, Sparkles, Search
} from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { Input } from '@/components/ui/input';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { section: 'Catalog' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/suppliers', icon: Truck, label: 'Suppliers' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { section: 'Operations' },
  { to: '/stock-in', icon: ArrowDownToLine, label: 'Stock In' },
  { to: '/stock-out', icon: ArrowUpFromLine, label: 'Stock Out' },
  { to: '/inventory', icon: Warehouse, label: 'Inventory' },
  { to: '/transactions', icon: ScrollText, label: 'Transactions' },
  { section: 'Insights' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/backup', icon: DatabaseBackup, label: 'Backup & Restore' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const active = NAV.find((n) => n.to && (n.end ? location.pathname === n.to : location.pathname.startsWith(n.to)));

  return (
    <div className="min-h-screen flex bg-background" data-testid="app-shell">
      {/* Sidebar */}
      <aside
        data-testid="app-sidebar"
        className={`
          fixed lg:sticky top-0 z-40 h-screen shrink-0 bg-zinc-100/70 border-r border-border
          transition-[width,transform] duration-200
          ${collapsed ? 'w-[72px]' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-zinc-900 text-white flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="leading-tight">
                <div className="font-semibold text-sm tracking-tight">Inventory CRM</div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Offline · v1.0</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="w-8 h-8 rounded-md bg-zinc-900 text-white flex items-center justify-center mx-auto">
              <Sparkles className="w-4 h-4" />
            </div>
          )}
          <button
            data-testid="sidebar-collapse-btn"
            onClick={() => setCollapsed((v) => !v)}
            className="hidden lg:flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-white hover:text-zinc-900 transition-colors duration-150"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-4rem)]">
          {NAV.map((item, i) => {
            if (item.section) {
              return !collapsed ? (
                <div key={i} className="overline pt-4 pb-1 px-3">{item.section}</div>
              ) : (
                <div key={i} className="border-t border-border my-2" />
              );
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''} ${collapsed ? 'justify-center' : ''}`}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-16 bg-background/95 backdrop-blur border-b border-border no-print">
          <div className="h-full flex items-center gap-3 px-4 lg:px-8">
            <button
              className="lg:hidden h-9 w-9 rounded-md border border-border flex items-center justify-center"
              onClick={() => setMobileOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="overline">Module</div>
              <div className="text-sm font-medium text-zinc-800" data-testid="topnav-current-page">
                {active?.label || 'Dashboard'}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 border border-border rounded-md px-2 h-9 bg-white w-72">
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Quick search…"
                  className="border-0 h-8 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm"
                  data-testid="topnav-search-input"
                />
                <span className="kbd">⌘K</span>
              </div>
              <div className="hidden md:flex items-center h-9 rounded-md border border-border px-3 text-xs text-muted-foreground bg-white">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                Offline-Ready
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  );
}
