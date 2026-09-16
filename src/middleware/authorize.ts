import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AuthenticatedUser } from './auth';
import { UserRole, Permission } from '../config/permissions';
import { ApiError } from '../utils/ApiError';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to specified user roles.
 */
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required to access this resource.');
    }

    // Super Admin bypasses role checks
    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ApiError(
        403,
        `Access denied. Role '${req.user.role}' is not authorized to perform this operation.`
      );
    }

    next();
  };
};

/**
 * Permission-Based Access Control Middleware
 * Checks if user possesses all specified permissions.
 */
export const authorizePermissions = (...requiredPermissions: Permission[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required to access this resource.');
    }

    // Super Admin bypasses permission checks
    if (req.user.role === 'super_admin') {
      return next();
    }

    const userPermissions = new Set(req.user.permissions || []);
    const hasAllPermissions = requiredPermissions.every((perm) => userPermissions.has(perm));

    if (!hasAllPermissions) {
      console.warn(`[RBAC Auth 403] User '${req.user.id}' (role: '${req.user.role}') lacks required permission(s): [${requiredPermissions.join(', ')}].`);
      throw new ApiError(
        403,
        `Access denied. Required permission(s): [${requiredPermissions.join(', ')}] missing.`
      );
    }

    next();
  };
};

/**
 * Organizational Scope Verification Helper
 * Verifies if user has authority over a specific branch, archdeaconry, or diocese target.
 */
export interface ScopeTarget {
  branchId?: string;
  archdeaconryId?: string;
  dioceseId?: string;
}

export const checkOrgScope = (user: AuthenticatedUser, target: ScopeTarget): boolean => {
  // Global administration scope
  if (user.role === 'super_admin' || user.role === 'admin') {
    return true;
  }

  // Diocesan Executive scope: covers all branches and archdeaconries in Accra Diocese
  if (user.role === 'accra_diocesan_executive' || user.role === 'content_manager') {
    if (target.dioceseId && target.dioceseId !== user.dioceseId) {
      return false;
    }
    return true;
  }

  // Archdeaconry Executive scope: covers branches within assigned archdeaconry
  if (user.role === 'archdeaconry_executive') {
    if (target.archdeaconryId && target.archdeaconryId !== user.archdeaconryId) {
      return false;
    }
    // If target specifies branchId without archdeaconryId, check passes if branch matches or logic handled in controller
    return true;
  }

  // Branch Executive scope: strictly restricted to assigned branchId
  if (user.role === 'branch_executive') {
    if (target.branchId && target.branchId !== user.branchId) {
      return false;
    }
    if (target.archdeaconryId && target.archdeaconryId !== user.archdeaconryId) {
      return false;
    }
    return true;
  }

  // Youth: limited to own scope
  return false;
};

/**
 * Scope Authorization Middleware Factory
 * Enforces organizational scope validation based on request params/query/body.
 */
export const authorizeScope = (getScopeTarget: (req: AuthenticatedRequest) => ScopeTarget) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required.');
    }

    const target = getScopeTarget(req);
    const isAllowed = checkOrgScope(req.user, target);

    if (!isAllowed) {
      throw new ApiError(
        403,
        'Access denied. You do not have permission to access data outside your assigned organizational scope.'
      );
    }

    next();
  };
};
