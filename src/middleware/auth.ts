import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyToken } from '../utils/jwt';
import { UserModel } from '../models/User';
import { UserRole, getPermissionsForRole } from '../config/permissions';
import { config } from '../config/env';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isApproved: boolean;
  isActive: boolean;
  dioceseId: string;
  archdeaconryId?: string;
  branchId?: string;
  permissions: string[];
  tokenVersion?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized access. Authentication token required.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Invalid authorization token format.');
    }

    const decoded = verifyToken(token);

    if (config.useInMemoryMock) {
      const { findMockUserById } = await import('../utils/mockStore');
      const mockUser = findMockUserById(decoded.id);

      if (!mockUser) {
        throw new ApiError(401, 'User account not found or has been removed.');
      }

      if (mockUser.isActive === false) {
        throw new ApiError(403, 'User account is deactivated.');
      }

      if (
        decoded.tokenVersion !== undefined &&
        mockUser.tokenVersion !== undefined &&
        decoded.tokenVersion !== mockUser.tokenVersion
      ) {
        throw new ApiError(401, 'Token has been revoked due to security updates. Please log in again.');
      }

      req.user = {
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role,
        isApproved: mockUser.isApproved,
        isActive: mockUser.isActive ?? true,
        dioceseId: mockUser.dioceseId || 'accra',
        archdeaconryId: mockUser.archdeaconryId || '',
        branchId: mockUser.branchId || '',
        permissions: mockUser.permissions && mockUser.permissions.length > 0
          ? mockUser.permissions
          : getPermissionsForRole(mockUser.role),
        tokenVersion: mockUser.tokenVersion ?? 0,
      };

      return next();
    }

    const userDoc = await UserModel.findById(decoded.id);

    if (!userDoc) {
      throw new ApiError(401, 'User account not found or has been removed.');
    }

    if (!userDoc.isActive) {
      throw new ApiError(403, 'User account is deactivated.');
    }

    if (
      decoded.tokenVersion !== undefined &&
      userDoc.tokenVersion !== undefined &&
      decoded.tokenVersion !== userDoc.tokenVersion
    ) {
      throw new ApiError(401, 'Token has been revoked due to security updates. Please log in again.');
    }

    const permissions = userDoc.permissions && userDoc.permissions.length > 0
      ? (userDoc.permissions as any)
      : getPermissionsForRole(userDoc.role);

    req.user = {
      id: userDoc.id || userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      isApproved: userDoc.isApproved,
      isActive: userDoc.isActive,
      dioceseId: userDoc.dioceseId || 'accra',
      archdeaconryId: userDoc.archdeaconryId || '',
      branchId: userDoc.branchId || '',
      permissions,
      tokenVersion: userDoc.tokenVersion ?? 0,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = authenticate;