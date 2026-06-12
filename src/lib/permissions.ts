import type { UserRole } from '../types';

type Module =
  | 'dashboard'
  | 'inventory'
  | 'suppliers'
  | 'purchases'
  | 'customers'
  | 'quotations'
  | 'sales'
  | 'projects'
  | 'accounting'
  | 'delivery'
  | 'warranty'
  | 'employees'
  | 'catalog'
  | 'reports'
  | 'settings';

type Permission = 'view' | 'create' | 'edit' | 'delete' | 'approve';

const PERMISSIONS: Record<UserRole, Partial<Record<Module, Permission[]>>> = {
  super_admin: {
    dashboard: ['view'],
    inventory: ['view', 'create', 'edit', 'delete'],
    suppliers: ['view', 'create', 'edit', 'delete'],
    purchases: ['view', 'create', 'edit', 'delete', 'approve'],
    customers: ['view', 'create', 'edit', 'delete'],
    quotations: ['view', 'create', 'edit', 'delete', 'approve'],
    sales: ['view', 'create', 'edit', 'delete'],
    projects: ['view', 'create', 'edit', 'delete'],
    accounting: ['view', 'create', 'edit', 'delete'],
    delivery: ['view', 'create', 'edit', 'delete'],
    warranty: ['view', 'create', 'edit', 'delete'],
    employees: ['view', 'create', 'edit', 'delete'],
    catalog: ['view', 'create', 'edit', 'delete'],
    reports: ['view'],
    settings: ['view', 'edit'],
  },
  manager: {
    dashboard: ['view'],
    inventory: ['view', 'create', 'edit'],
    suppliers: ['view', 'create', 'edit'],
    purchases: ['view', 'create', 'edit', 'approve'],
    customers: ['view', 'create', 'edit'],
    quotations: ['view', 'create', 'edit', 'approve'],
    sales: ['view', 'create', 'edit'],
    projects: ['view', 'create', 'edit'],
    accounting: ['view'],
    delivery: ['view', 'create', 'edit'],
    warranty: ['view', 'create', 'edit'],
    employees: ['view', 'create', 'edit'],
    catalog: ['view', 'create', 'edit'],
    reports: ['view'],
    settings: ['view'],
  },
  sales: {
    dashboard: ['view'],
    inventory: ['view'],
    customers: ['view', 'create', 'edit'],
    quotations: ['view', 'create', 'edit'],
    sales: ['view', 'create'],
    projects: ['view', 'create', 'edit'],
    catalog: ['view'],
    delivery: ['view'],
    warranty: ['view', 'create'],
    reports: ['view'],
    suppliers: [],
    purchases: [],
    accounting: [],
    employees: [],
    settings: [],
  },
  inventory: {
    dashboard: ['view'],
    inventory: ['view', 'create', 'edit'],
    suppliers: ['view'],
    purchases: ['view', 'create', 'edit'],
    catalog: ['view', 'create', 'edit'],
    delivery: ['view', 'create', 'edit'],
    warranty: ['view'],
    reports: ['view'],
    customers: [],
    quotations: [],
    sales: [],
    projects: [],
    accounting: [],
    employees: [],
    settings: [],
  },
  accountant: {
    dashboard: ['view'],
    accounting: ['view', 'create', 'edit'],
    sales: ['view'],
    purchases: ['view'],
    suppliers: ['view'],
    customers: ['view'],
    reports: ['view'],
    inventory: ['view'],
    quotations: ['view'],
    projects: ['view'],
    delivery: [],
    warranty: [],
    employees: ['view'],
    catalog: [],
    settings: [],
  },
  delivery: {
    dashboard: ['view'],
    delivery: ['view', 'edit'],
    sales: ['view'],
    customers: ['view'],
    inventory: [],
    suppliers: [],
    purchases: [],
    quotations: [],
    accounting: [],
    projects: [],
    warranty: [],
    employees: [],
    catalog: [],
    reports: [],
    settings: [],
  },
};

export function can(role: UserRole, module: Module, permission: Permission): boolean {
  const rolePerms = PERMISSIONS[role];
  if (!rolePerms) return false;
  const modulePerms = rolePerms[module];
  if (!modulePerms) return false;
  return modulePerms.includes(permission);
}

export function getAccessibleModules(role: UserRole): Module[] {
  const rolePerms = PERMISSIONS[role];
  return (Object.keys(rolePerms) as Module[]).filter(
    m => rolePerms[m] && rolePerms[m]!.includes('view')
  );
}

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  sales: 'Sales Executive',
  inventory: 'Inventory Manager',
  accountant: 'Accountant',
  delivery: 'Delivery Staff',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-danger-100 text-danger-700',
  manager: 'bg-primary-100 text-primary-700',
  sales: 'bg-accent-100 text-accent-700',
  inventory: 'bg-warning-100 text-warning-700',
  accountant: 'bg-success-100 text-success-700',
  delivery: 'bg-slate-100 text-slate-600',
};
