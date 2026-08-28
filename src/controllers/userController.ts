import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { UserRole, getPermissionsForRole } from '../config/permissions';
import { config } from '../config/env';
import { inMemoryUsers, findMockUserById } from '../utils/mockStore';

export const getUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { role, isApproved, isActive, archdeaconryId, branchId, search } = req.query;

  if (config.useInMemoryMock) {
    let filtered = [...inMemoryUsers];

    if (role) {
      filtered = filtered.filter((u) => u.role === role);
    }
    if (isApproved !== undefined) {
      const approvedBool = isApproved === 'true';
      filtered = filtered.filter((u) => u.isApproved === approvedBool);
    }
    if (isActive !== undefined) {
      const activeBool = isActive === 'true';
      filtered = filtered.filter((u) => u.isActive === activeBool);
    }
    if (archdeaconryId) {
      filtered = filtered.filter((u) => u.archdeaconryId === archdeaconryId);
    }
    if (branchId) {
      filtered = filtered.filter((u) => u.branchId === branchId);
    }
    if (search) {
      const searchStr = (search as string).toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(searchStr) ||
          u.email.toLowerCase().includes(searchStr)
      );
    }

    const safeUsers = filtered.map(({ passwordHash: _, ...u }) => u);
    res.status(200).json({
      success: true,
      count: safeUsers.length,
      data: safeUsers,
    });
    return;
  }

  const query: Record<string, any> = {};

  if (role) query.role = role;
  if (isApproved !== undefined) query.isApproved = isApproved === 'true';
  if (isActive !== undefined) query.isActive = isActive === 'true';
  if (archdeaconryId) query.archdeaconryId = archdeaconryId;
  if (branchId) query.branchId = branchId;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const users = await UserModel.find(query).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users.map((u) => u.toJSON()),
  });
};

export const approveUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isApproved } = req.body;

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);
    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }
    mockUser.isApproved = isApproved;
    const { passwordHash: _, ...safeMockUser } = mockUser;
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

  userDoc.isApproved = isApproved;
  await userDoc.save();

  res.status(200).json({
    success: true,
    message: `User registration approval status updated to ${isApproved}.`,
    data: userDoc.toJSON(),
  });
};

export const updateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { role, permissions, dioceseId, archdeaconryId, branchId } = req.body;

  // Only Super Admin can assign super_admin role
  if (role === 'super_admin' && req.user?.role !== 'super_admin') {
    throw new ApiError(403, 'Only Super Administrators can assign the Super Admin role.');
  }

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);
    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }

    mockUser.role = role as UserRole;
    if (dioceseId !== undefined) mockUser.dioceseId = dioceseId;
    if (archdeaconryId !== undefined) mockUser.archdeaconryId = archdeaconryId;
    if (branchId !== undefined) mockUser.branchId = branchId;
    mockUser.permissions = getPermissionsForRole(role as UserRole, permissions);
    mockUser.tokenVersion = (mockUser.tokenVersion || 0) + 1; // Invalidate active tokens

    const { passwordHash: _, ...safeMockUser } = mockUser;
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

  userDoc.role = role as UserRole;
  if (dioceseId !== undefined) userDoc.dioceseId = dioceseId;
  if (archdeaconryId !== undefined) userDoc.archdeaconryId = archdeaconryId;
  if (branchId !== undefined) userDoc.branchId = branchId;
  userDoc.permissions = getPermissionsForRole(role as UserRole, permissions);
  userDoc.tokenVersion = (userDoc.tokenVersion || 0) + 1; // Invalidate active tokens

  await userDoc.save();

  res.status(200).json({
    success: true,
    message: `User role successfully updated to '${role}'.`,
    data: userDoc.toJSON(),
  });
};

export const updateUserStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);
    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }
    mockUser.isActive = isActive;
    if (!isActive) {
      mockUser.tokenVersion = (mockUser.tokenVersion || 0) + 1; // Revoke tokens on suspension
    }
    const { passwordHash: _, ...safeMockUser } = mockUser;
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

  userDoc.isActive = isActive;
  if (!isActive) {
    userDoc.tokenVersion = (userDoc.tokenVersion || 0) + 1; // Revoke tokens on suspension
  }
  await userDoc.save();

  res.status(200).json({
    success: true,
    message: `User account active status updated to ${isActive}.`,
    data: userDoc.toJSON(),
  });
};
