import type { Role } from '@prisma/client';

export const ROLES: Role[] = ['OWNER', 'ADMIN', 'MARKETING', 'SALES', 'VIEWER'];

export type Permission =
  | 'workspace:manage'
  | 'members:manage'
  | 'billing:view'
  | 'contacts:read'
  | 'contacts:write'
  | 'contacts:delete'
  | 'contacts:import'
  | 'segments:read'
  | 'segments:write'
  | 'campaigns:read'
  | 'campaigns:write'
  | 'campaigns:launch'
  | 'landing:read'
  | 'landing:write'
  | 'templates:read'
  | 'templates:write'
  | 'leads:read'
  | 'leads:write'
  | 'leads:assign'
  | 'tasks:read'
  | 'tasks:write'
  | 'inbox:read'
  | 'inbox:write'
  | 'analytics:read'
  | 'email_accounts:read'
  | 'email_accounts:write'
  | 'deliverability:read'
  | 'suppression:read'
  | 'suppression:write'
  | 'automations:read'
  | 'automations:write'
  | 'integrations:read'
  | 'integrations:write'
  | 'settings:read'
  | 'settings:write'
  | 'audit:read'
  | 'ai:use';

const ALL: Permission[] = [
  'workspace:manage', 'members:manage', 'billing:view',
  'contacts:read', 'contacts:write', 'contacts:delete', 'contacts:import',
  'segments:read', 'segments:write',
  'campaigns:read', 'campaigns:write', 'campaigns:launch',
  'landing:read', 'landing:write',
  'templates:read', 'templates:write',
  'leads:read', 'leads:write', 'leads:assign',
  'tasks:read', 'tasks:write',
  'inbox:read', 'inbox:write',
  'analytics:read',
  'email_accounts:read', 'email_accounts:write',
  'deliverability:read',
  'suppression:read', 'suppression:write',
  'automations:read', 'automations:write',
  'integrations:read', 'integrations:write',
  'settings:read', 'settings:write',
  'audit:read', 'ai:use',
];

const MARKETING: Permission[] = [
  'contacts:read', 'contacts:write', 'contacts:import',
  'segments:read', 'segments:write',
  'campaigns:read', 'campaigns:write', 'campaigns:launch',
  'landing:read', 'landing:write',
  'templates:read', 'templates:write',
  'leads:read',
  'tasks:read',
  'inbox:read', 'inbox:write',
  'analytics:read',
  'email_accounts:read', 'deliverability:read',
  'suppression:read', 'suppression:write',
  'automations:read',
  'integrations:read',
  'settings:read',
  'ai:use',
];

const SALES: Permission[] = [
  'contacts:read',
  'leads:read', 'leads:write',
  'tasks:read', 'tasks:write',
  'inbox:read', 'inbox:write',
  'analytics:read',
  'campaigns:read', 'landing:read', 'segments:read', 'templates:read',
  'suppression:read', 'suppression:write',
  'settings:read',
  'ai:use',
];

const VIEWER: Permission[] = [
  'contacts:read', 'segments:read', 'campaigns:read', 'landing:read',
  'templates:read', 'leads:read', 'tasks:read', 'inbox:read',
  'analytics:read', 'email_accounts:read', 'deliverability:read',
  'suppression:read', 'automations:read', 'integrations:read', 'settings:read',
];

const ADMIN: Permission[] = ALL.filter((p) => p !== 'workspace:manage');

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: ALL,
  ADMIN,
  MARKETING,
  SALES,
  VIEWER,
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export const ROLE_LABELS: Record<Role, { fr: string; en: string }> = {
  OWNER: { fr: 'Propriétaire', en: 'Owner' },
  ADMIN: { fr: 'Administrateur', en: 'Admin' },
  MARKETING: { fr: 'Marketing', en: 'Marketing' },
  SALES: { fr: 'Commercial', en: 'Sales' },
  VIEWER: { fr: 'Lecteur', en: 'Viewer' },
};
