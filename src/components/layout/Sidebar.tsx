import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, FileText, ShoppingCart, Truck, Building2,
  Wrench, CreditCard, ClipboardList, Shield, UserCheck, BarChart2,
  Settings, ChevronDown, ChevronRight, Box, FolderOpen, Layers,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { can } from '../../lib/permissions';
import type { UserRole } from '../../types';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  module?: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={16} />, path: '/dashboard', module: 'dashboard' },
  {
    label: 'Inventory',
    icon: <Package size={16} />,
    module: 'inventory',
    children: [
      { label: 'Products', icon: <Box size={14} />, path: '/inventory/products', module: 'inventory' },
      { label: 'Categories', icon: <Layers size={14} />, path: '/inventory/categories', module: 'inventory' },
      { label: 'Stock Operations', icon: <ClipboardList size={14} />, path: '/inventory/stock', module: 'inventory' },
      { label: 'Catalog', icon: <FolderOpen size={14} />, path: '/catalog', module: 'catalog' },
    ],
  },
  {
    label: 'Sales',
    icon: <ShoppingCart size={16} />,
    module: 'sales',
    children: [
      { label: 'Point of Sale', icon: <ShoppingCart size={14} />, path: '/sales/pos', module: 'sales' },
      { label: 'Invoices', icon: <FileText size={14} />, path: '/sales/invoices', module: 'sales' },
      { label: 'Quotations', icon: <ClipboardList size={14} />, path: '/quotations', module: 'quotations' },
    ],
  },
  {
    label: 'Procurement',
    icon: <Building2 size={16} />,
    module: 'purchases',
    children: [
      { label: 'Suppliers', icon: <Building2 size={14} />, path: '/suppliers', module: 'suppliers' },
      { label: 'Purchase Orders', icon: <FileText size={14} />, path: '/purchases', module: 'purchases' },
    ],
  },
  { label: 'Customers', icon: <Users size={16} />, path: '/customers', module: 'customers' },
  { label: 'Projects', icon: <FolderOpen size={16} />, path: '/projects', module: 'projects' },
  { label: 'Delivery', icon: <Truck size={16} />, path: '/delivery', module: 'delivery' },
  { label: 'Warranty', icon: <Shield size={16} />, path: '/warranty', module: 'warranty' },
  {
    label: 'Accounting',
    icon: <CreditCard size={16} />,
    module: 'accounting',
    children: [
      { label: 'Overview', icon: <LayoutDashboard size={14} />, path: '/accounting', module: 'accounting' },
      { label: 'Expenses', icon: <CreditCard size={14} />, path: '/accounting/expenses', module: 'accounting' },
      { label: 'Payments', icon: <Wrench size={14} />, path: '/accounting/payments', module: 'accounting' },
    ],
  },
  { label: 'Employees', icon: <UserCheck size={16} />, path: '/employees', module: 'employees' },
  { label: 'Reports', icon: <BarChart2 size={16} />, path: '/reports', module: 'reports' },
  { label: 'Settings', icon: <Settings size={16} />, path: '/settings', module: 'settings' },
];

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
  role: UserRole;
  depth?: number;
}

function SidebarNavItem({ item, collapsed, role, depth = 0 }: SidebarNavItemProps) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(() => {
    if (!item.children) return false;
    return item.children.some(c => c.path && location.pathname.startsWith(c.path));
  });

  const hasAccess = item.module ? can(role, item.module as Parameters<typeof can>[1], 'view') : true;
  if (!hasAccess) return null;

  if (item.children) {
    const isActive = item.children.some(c => c.path && location.pathname.startsWith(c.path));
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
            isActive ? 'text-primary-700 bg-primary-50' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            collapsed && 'justify-center'
          )}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && (
            <>
              <span className="flex-1 text-left">{item.label}</span>
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </>
          )}
        </button>
        {expanded && !collapsed && (
          <div className="mt-0.5 ml-2 pl-4 border-l border-slate-200 space-y-0.5">
            {item.children.map((child) => (
              <SidebarNavItem key={child.path} item={child} collapsed={false} role={role} depth={1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!item.path) return null;

  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
        depth === 0 ? '' : '',
        isActive
          ? 'bg-primary-50 text-primary-700 font-semibold'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        collapsed && 'justify-center',
      )}
      title={collapsed ? item.label : undefined}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

interface SidebarProps {
  collapsed: boolean;
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user } = useAuthStore();
  const role = user?.role ?? 'sales';

  return (
    <aside className={cn(
      'fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-slate-200 transition-all duration-200',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Logo */}
      <div className={cn(
        'flex items-center gap-3 px-4 h-16 border-b border-slate-200 flex-shrink-0',
        collapsed && 'justify-center px-2'
      )}>
        <div className="h-8 w-8 bg-primary-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
          <Building2 size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 truncate">SI Building</p>
            <p className="text-2xs text-slate-400 truncate">Solutions ERP</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <SidebarNavItem
            key={item.path ?? item.label}
            item={item}
            collapsed={collapsed}
            role={role}
          />
        ))}
      </nav>

      {/* User section at bottom */}
      {!collapsed && user && (
        <div className="flex-shrink-0 border-t border-slate-100 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {user.full_name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-700 truncate">{user.full_name}</p>
              <p className="text-2xs text-slate-400 truncate capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
