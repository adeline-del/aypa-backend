import { Response } from 'express';

import { AuthenticatedRequest } from '../middleware/auth';

import { UserModel } from '../models/User';

import { ApiError } from '../utils/ApiError';

import {
  UserRole,
  getPermissionsForRole,
} from '../config/permissions';

import { config } from '../config/env';

import {
  inMemoryUsers,
  findMockUserById,
} from '../utils/mockStore';

import { checkOrgScope } from '../middleware/authorize';

const canManageUser = (
  req: AuthenticatedRequest,
  target: {
    dioceseId?: string;
    archdeaconryId?: string;
    branchId?: string;
  },
): boolean => {
  if (!req.user) {
    return false;
  }

  if (
    req.user.role === 'super_admin' ||
    req.user.role === 'admin'
  ) {
    return true;
  }

  return checkOrgScope(req.user, {
    dioceseId: target.dioceseId,
    archdeaconryId: target.archdeaconryId,
    branchId: target.branchId,
  });
};

export const getUsers = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const {
    role,
    isApproved,
    isActive,
    archdeaconryId,
    branchId,
    search,
  } = req.query;

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryUsers];

    /**
     * Enforce organizational scope BEFORE applying
     * client-supplied filters.
     */
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'super_admin'
    ) {
      filtered = filtered.filter((user) =>
        canManageUser(req, user),
      );
    }

    if (role) {
      filtered = filtered.filter(
        (user) => user.role === role,
      );
    }

    if (isApproved !== undefined) {
      const approvedBool = isApproved === 'true';

      filtered = filtered.filter(
        (user) => user.isApproved === approvedBool,
      );
    }

    if (isActive !== undefined) {
      const activeBool = isActive === 'true';

      filtered = filtered.filter(
        (user) => user.isActive === activeBool,
      );
    }

    if (archdeaconryId) {
      filtered = filtered.filter(
        (user) =>
          user.archdeaconryId === archdeaconryId,
      );
    }

    if (branchId) {
      filtered = filtered.filter(
        (user) => user.branchId === branchId,
      );
    }

    if (search) {
      const searchString = String(search).toLowerCase();

      filtered = filtered.filter(
        (user) =>
          user.name
            .toLowerCase()
            .includes(searchString) ||
          user.email
            .toLowerCase()
            .includes(searchString),
      );
    }

    const safeUsers = filtered.map(
      ({ passwordHash: _passwordHash, ...user }) =>
        user,
    );

    res.status(200).json({
      success: true,
      count: safeUsers.length,
      data: safeUsers,
    });

    return;
  }

  const query: Record<string, unknown> = {};

  /**
   * Scoped roles must always remain inside their own
   * organizational boundaries.
   */
  if (req.user.role === 'accra_diocesan_executive') {
    query.dioceseId = req.user.dioceseId;
  }

  if (req.user.role === 'archdeaconry_executive') {
    query.archdeaconryId = req.user.archdeaconryId;
  }

  if (req.user.role === 'branch_executive') {
    query.branchId = req.user.branchId;
  }

  if (role) {
    query.role = role;
  }

  if (isApproved !== undefined) {
    query.isApproved = isApproved === 'true';
  }

  if (isActive !== undefined) {
    query.isActive = isActive === 'true';
  }

  /**
   * Do not allow query parameters to replace the
   * authenticated user's organizational scope.
   */
  if (
    req.user.role === 'admin' ||
    req.user.role === 'super_admin'
  ) {
    if (archdeaconryId) {
      query.archdeaconryId = archdeaconryId;
    }

    if (branchId) {
      query.branchId = branchId;
    }
  }

  if (search) {
    query.$or = [
      {
        name: {
          $regex: String(search),
          $options: 'i',
        },
      },
      {
        email: {
          $regex: String(search),
          $options: 'i',
        },
      },
    ];
  }

  const users = await UserModel.find(query).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users.map((user) => user.toJSON()),
  });
};

export const approveUser = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const { isApproved } = req.body;

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);

    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (!canManageUser(req, mockUser)) {
      throw new ApiError(
        403,
        'Access denied. You cannot manage users outside your organizational scope.',
      );
    }

    mockUser.isApproved = isApproved;

    const {
      passwordHash: _passwordHash,
      ...safeMockUser
    } = mockUser;

    res.status(200).json({
      success: true,
      message: `User registration approval status updated to ${isApproved}.`,
      data: safeMockUser,
    });

    return;
  }

  const userDoc = await UserModel.findById(id);

  if (!userDoc) {
    throw new ApiError(404, 'User not found.');
  }

  if (!canManageUser(req, userDoc)) {
    throw new ApiError(
      403,
      'Access denied. You cannot manage users outside your organizational scope.',
    );
  }

  userDoc.isApproved = isApproved;

  await userDoc.save();

  res.status(200).json({
    success: true,
    message: `User registration approval status updated to ${isApproved}.`,
    data: userDoc.toJSON(),
  });
};

export const updateUserRole = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const {
    id,
  } = req.params;

  const {
    role,
    permissions,
    dioceseId,
    archdeaconryId,
    branchId,
  } = req.body;

  if (
    role === 'super_admin' &&
    req.user.role !== 'super_admin'
  ) {
    throw new ApiError(
      403,
      'Only Super Administrators can assign the Super Admin role.',
    );
  }

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);

    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (!canManageUser(req, mockUser)) {
      throw new ApiError(
        403,
        'Access denied. You cannot manage users outside your organizational scope.',
      );
    }

    /**
     * A scoped administrator cannot move a user into
     * another organizational scope.
     */
    if (
      req.user.role !== 'admin' &&
      req.user.role !== 'super_admin'
    ) {
      if (
        dioceseId !== undefined &&
        dioceseId !== req.user.dioceseId
      ) {
        throw new ApiError(
          403,
          'You cannot assign a user outside your diocese.',
        );
      }

      if (
        req.user.archdeaconryId &&
        archdeaconryId !== undefined &&
        archdeaconryId !== req.user.archdeaconryId
      ) {
        throw new ApiError(
          403,
          'You cannot assign a user outside your archdeaconry.',
        );
      }

      if (
        req.user.branchId &&
        branchId !== undefined &&
        branchId !== req.user.branchId
      ) {
        throw new ApiError(
          403,
          'You cannot assign a user outside your branch.',
        );
      }
    }

    mockUser.role = role as UserRole;

    if (dioceseId !== undefined) {
      mockUser.dioceseId = dioceseId;
    }

    if (archdeaconryId !== undefined) {
      mockUser.archdeaconryId = archdeaconryId;
    }

    if (branchId !== undefined) {
      mockUser.branchId = branchId;
    }

    mockUser.permissions = getPermissionsForRole(
      role as UserRole,
      permissions,
    );

    mockUser.tokenVersion =
      (mockUser.tokenVersion || 0) + 1;

    const {
      passwordHash: _passwordHash,
      ...safeMockUser
    } = mockUser;

    res.status(200).json({
      success: true,
      message: `User role successfully updated to '${role}'.`,
      data: safeMockUser,
    });

    return;
  }

  const userDoc = await UserModel.findById(id);

  if (!userDoc) {
    throw new ApiError(404, 'User not found.');
  }

  if (!canManageUser(req, userDoc)) {
    throw new ApiError(
      403,
      'Access denied. You cannot manage users outside your organizational scope.',
    );
  }

  if (
    req.user.role !== 'admin' &&
    req.user.role !== 'super_admin'
  ) {
    if (
      dioceseId !== undefined &&
      dioceseId !== req.user.dioceseId
    ) {
      throw new ApiError(
        403,
        'You cannot assign a user outside your diocese.',
      );
    }

    if (
      req.user.archdeaconryId &&
      archdeaconryId !== undefined &&
      archdeaconryId !== req.user.archdeaconryId
    ) {
      throw new ApiError(
        403,
        'You cannot assign a user outside your archdeaconry.',
      );
    }

    if (
      req.user.branchId &&
      branchId !== undefined &&
      branchId !== req.user.branchId
    ) {
      throw new ApiError(
        403,
        'You cannot assign a user outside your branch.',
      );
    }
  }

  userDoc.role = role as UserRole;

  if (dioceseId !== undefined) {
    userDoc.dioceseId = dioceseId;
  }

  if (archdeaconryId !== undefined) {
    userDoc.archdeaconryId = archdeaconryId;
  }

  if (branchId !== undefined) {
    userDoc.branchId = branchId;
  }

  userDoc.permissions = getPermissionsForRole(
    role as UserRole,
    permissions,
  );

  userDoc.tokenVersion =
    (userDoc.tokenVersion || 0) + 1;

  await userDoc.save();

  res.status(200).json({
    success: true,
    message: `User role successfully updated to '${role}'.`,
    data: userDoc.toJSON(),
  });
};

export const updateUserStatus = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const { isActive } = req.body;

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);

    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (!canManageUser(req, mockUser)) {
      throw new ApiError(
        403,
        'Access denied. You cannot manage users outside your organizational scope.',
      );
    }

    mockUser.isActive = isActive;

    if (!isActive) {
      mockUser.tokenVersion =
        (mockUser.tokenVersion || 0) + 1;
    }

    const {
      passwordHash: _passwordHash,
      ...safeMockUser
    } = mockUser;

    res.status(200).json({
      success: true,
      message: `User account active status updated to ${isActive}.`,
      data: safeMockUser,
    });

    return;
  }

  const userDoc = await UserModel.findById(id);

  if (!userDoc) {
    throw new ApiError(404, 'User not found.');
  }

  if (!canManageUser(req, userDoc)) {
    throw new ApiError(
      403,
      'Access denied. You cannot manage users outside your organizational scope.',
    );
  }

  userDoc.isActive = isActive;

  if (!isActive) {
    userDoc.tokenVersion =
      (userDoc.tokenVersion || 0) + 1;
  }

  await userDoc.save();

  res.status(200).json({
    success: true,
    message: `User account active status updated to ${isActive}.`,
    data: userDoc.toJSON(),
  });
};