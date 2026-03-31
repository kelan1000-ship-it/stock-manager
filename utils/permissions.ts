import { UserRole } from '../types/auth';

export type Permission = 
  | 'inventory.view'
  | 'inventory.create'
  | 'inventory.edit'
  | 'inventory.delete'
  | 'inventory.bulk'
  | 'users.manage'
  | 'settings.manage'
  | 'reports.view'
  | 'orders.create'
  | 'transfers.create';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.bulk',
    'users.manage', 'settings.manage', 'reports.view', 
    'orders.create', 'transfers.create'
  ],
  manager: [
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.bulk',
    'reports.view', 'orders.create', 'transfers.create'
  ],
  branch: [ // Legacy "Branch User" treated as Manager for now to avoid breaking changes
    'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete', 'inventory.bulk',
    'orders.create', 'transfers.create'
  ],
  editor: [
    'inventory.view', 'inventory.edit', 
    'orders.create', 'transfers.create'
  ],
  viewer: [
    'inventory.view', 'reports.view'
  ]
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (!role) return false;
  // Admin bypass
  if (role === 'admin') return true;
  
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}
