export type UserRole =
  | 'youth'
  | 'branch_executive'
  | 'archdeaconry_executive'
  | 'accra_diocesan_executive'
  | 'content_manager'
  | 'admin'
  | 'super_admin';

export const ALL_ROLES: UserRole[] = [
  'youth',
  'branch_executive',
  'archdeaconry_executive',
  'accra_diocesan_executive',
  'content_manager',
  'admin',
  'super_admin',
];

export const EXECUTIVE_ROLES: UserRole[] = [
  'branch_executive',
  'archdeaconry_executive',
  'accra_diocesan_executive',
];

export const PUBLIC_REGISTERABLE_ROLES: UserRole[] = [
  'youth',
  'branch_executive',
  'archdeaconry_executive',
  'accra_diocesan_executive',
  'content_manager',
];

export type Permission =
  | 'profile:read'
  | 'profile:update'
  | 'events:read'
  | 'events:create'
  | 'events:update'
  | 'events:delete'
  | 'events:register'
  | 'content:read'
  | 'content:create'
  | 'content:update'
  | 'content:delete'
  | 'content:publish'
  | 'reports:create'
  | 'reports:read'
  | 'reports:update'
  | 'reports:review'
  | 'tasks:read'
  | 'tasks:create'
  | 'tasks:update'
  | 'tasks:delete'
  | 'users:read'
  | 'users:create'
  | 'users:update'
  | 'users:approve'
  | 'users:suspend'
  | 'users:assign-role'
  | 'branches:read'
  | 'branches:create'
  | 'branches:update'
  | 'branches:delete'
  | 'archdeaconries:read'
  | 'archdeaconries:create'
  | 'archdeaconries:update'
  | 'dashboard:read'
  | 'audit:read'
  | 'system:manage';

const YOUTH_PERMISSIONS: Permission[] = [
  'profile:read',
  'profile:update',
  'events:read',
  'events:register',
  'content:read',
];

const BRANCH_EXEC_PERMISSIONS: Permission[] = [
  ...YOUTH_PERMISSIONS,
  'dashboard:read',
  'branches:read',
  'reports:create',
  'reports:read',
  'reports:update',
  'tasks:read',
  'tasks:update',
];

const ARCHDEACONRY_EXEC_PERMISSIONS: Permission[] = [
  ...BRANCH_EXEC_PERMISSIONS,
  'archdeaconries:read',
  'reports:review',
  'tasks:create',
];

const ACCRA_DIOCESAN_EXEC_PERMISSIONS: Permission[] = [
  ...ARCHDEACONRY_EXEC_PERMISSIONS,
  'events:create',
  'events:update',
  'events:delete',
  'tasks:delete',
  'branches:create',
  'branches:update',
];

const CONTENT_MANAGER_PERMISSIONS: Permission[] = [
  'profile:read',
  'profile:update',
  'events:read',
  'events:create',
  'events:update',
  'events:delete',
  'content:read',
  'content:create',
  'content:update',
  'content:delete',
  'content:publish',
  'dashboard:read',
];

const ADMIN_PERMISSIONS: Permission[] = [
  'profile:read',
  'profile:update',
  'events:read',
  'events:create',
  'events:update',
  'events:delete',
  'content:read',
  'content:create',
  'content:update',
  'content:delete',
  'content:publish',
  'reports:create',
  'reports:read',
  'reports:update',
  'reports:review',
  'tasks:read',
  'tasks:create',
  'tasks:update',
  'tasks:delete',
  'users:read',
  'users:create',
  'users:update',
  'users:approve',
  'users:suspend',
  'users:assign-role',
  'branches:read',
  'branches:create',
  'branches:update',
  'branches:delete',
  'archdeaconries:read',
  'archdeaconries:create',
  'archdeaconries:update',
  'dashboard:read',
  'audit:read',
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  ...ADMIN_PERMISSIONS,
  'system:manage',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  youth: YOUTH_PERMISSIONS,
  branch_executive: BRANCH_EXEC_PERMISSIONS,
  archdeaconry_executive: ARCHDEACONRY_EXEC_PERMISSIONS,
  accra_diocesan_executive: ACCRA_DIOCESAN_EXEC_PERMISSIONS,
  content_manager: CONTENT_MANAGER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  super_admin: SUPER_ADMIN_PERMISSIONS,
};

export const getPermissionsForRole = (
  role: UserRole,
  customPermissions?: string[]
): Permission[] => {
  const basePermissions = ROLE_PERMISSIONS[role] || YOUTH_PERMISSIONS;
  if (!customPermissions || customPermissions.length === 0) {
    return basePermissions;
  }
  const merged = new Set<Permission>([...basePermissions, ...(customPermissions as Permission[])]);
  return Array.from(merged);
};
