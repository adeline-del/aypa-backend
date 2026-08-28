import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { config } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { generateToken } from '../utils/jwt';
import { getPermissionsForRole, UserRole } from '../config/permissions';
import { findMockUserByEmail, findMockUserById, addMockUser } from '../utils/mockStore';
import bcrypt from 'bcryptjs';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  const {
    name,
    email,
    password,
    role,
    church,
    phone,
    dioceseId,
    archdeaconryId,
    branchId,
    profileImage,
  } = req.body;

  // Protect against public self-registration of administrative super-user roles
  if (role === 'admin' || role === 'super_admin') {
    throw new ApiError(
      403,
      'Public self-registration for administrative roles is prohibited. Admin accounts must be created by a Super Admin.'
    );
  }

  // Validate server-side required organizational fields based on role
  if (role === 'branch_executive' && (!branchId || !archdeaconryId)) {
    throw new ApiError(400, 'Branch Executive registration requires branchId and archdeaconryId.');
  }
  if (role === 'archdeaconry_executive' && !archdeaconryId) {
    throw new ApiError(400, 'Archdeaconry Executive registration requires archdeaconryId.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Youth accounts auto-approved; Executive & Content Manager accounts require approval
  const isApproved = role === 'youth';
  const effectiveDioceseId = dioceseId || 'accra';

  if (config.useInMemoryMock) {
    const existingMock = findMockUserByEmail(normalizedEmail);
    if (existingMock) {
      throw new ApiError(400, 'User with this email address already exists.');
    }

    const newId = Date.now().toString();
    const permissions = getPermissionsForRole(role as UserRole);
    const passwordHash = bcrypt.hashSync(password, 10);

    const newMockUser = {
      id: newId,
      name,
      email: normalizedEmail,
      passwordHash,
      role: role as UserRole,
      church: church || '',
      phone: phone || '',
      dioceseId: effectiveDioceseId,
      archdeaconryId: archdeaconryId || '',
      branchId: branchId || '',
      profileImage: profileImage || '',
      memberSince: new Date().toISOString().split('T')[0],
      isApproved,
      isActive: true,
      permissions,
      tokenVersion: 0,
    };

    addMockUser(newMockUser);

    const { passwordHash: _, ...safeMockUser } = newMockUser;

    if (!isApproved) {
      res.status(201).json({
        success: true,
        message: 'Registration submitted successfully! Account pending executive approval by an administrator.',
        data: {
          user: safeMockUser,
        },
      });
      return;
    }

    const token = generateToken({
      id: newMockUser.id,
      role: newMockUser.role,
      tokenVersion: newMockUser.tokenVersion,
    });
    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: safeMockUser,
        token,
      },
    });
    return;
  }

  const existingUser = await UserModel.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ApiError(400, 'User with this email address already exists.');
  }

  const newUserDoc = await UserModel.create({
    name,
    email: normalizedEmail,
    password,
    role,
    church,
    phone,
    dioceseId: effectiveDioceseId,
    archdeaconryId,
    branchId,
    profileImage,
    memberSince: new Date().toISOString().split('T')[0],
    isApproved,
    isActive: true,
    tokenVersion: 0,
  });

  const userJSON = newUserDoc.toJSON();

  if (!isApproved) {
    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Executive approval pending by an administrator.',
      data: {
        user: userJSON,
      },
    });
    return;
  }

  const token = generateToken({
    id: userJSON.id,
    role: userJSON.role,
    tokenVersion: userJSON.tokenVersion ?? 0,
  });
  res.status(201).json({
    success: true,
    message: 'Registration successful.',
    data: {
      user: userJSON,
      token,
    },
  });
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  if (config.useInMemoryMock) {
    const mockUser = findMockUserByEmail(normalizedEmail);
    if (!mockUser || !bcrypt.compareSync(password, mockUser.passwordHash)) {
      throw new ApiError(401, 'Invalid credentials or user does not exist.');
    }

    if (mockUser.isActive === false) {
      throw new ApiError(403, 'Account is deactivated. Please contact system support.');
    }

    if (!mockUser.isApproved) {
      throw new ApiError(403, 'Account pending executive approval by an administrator.');
    }

    const token = generateToken({
      id: mockUser.id,
      role: mockUser.role,
      tokenVersion: mockUser.tokenVersion ?? 0,
    });
    const { passwordHash: _, ...safeMockUser } = mockUser;

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: safeMockUser,
        token,
      },
    });
    return;
  }

  const userDoc = await UserModel.findOne({ email: normalizedEmail }).select('+password');
  if (!userDoc) {
    throw new ApiError(401, 'Invalid credentials or user does not exist.');
  }

  const isPasswordValid = await userDoc.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid credentials or user does not exist.');
  }

  if (!userDoc.isActive) {
    throw new ApiError(403, 'Account is deactivated. Please contact system support.');
  }

  if (!userDoc.isApproved) {
    throw new ApiError(403, 'Account pending executive approval by an administrator.');
  }

  userDoc.lastLoginAt = new Date();
  await userDoc.save();

  const token = generateToken({
    id: userDoc.id,
    role: userDoc.role,
    tokenVersion: userDoc.tokenVersion ?? 0,
  });
  const userJSON = userDoc.toJSON();

  res.status(200).json({
    success: true,
    message: 'Login successful.',
    data: {
      user: userJSON,
      token,
    },
  });
};

export const getCurrentUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(req.user.id);
    if (!mockUser) {
      throw new ApiError(404, 'User account not found.');
    }
    const { passwordHash: _, ...safeMockUser } = mockUser;
    res.status(200).json({
      success: true,
      data: safeMockUser,
    });
    return;
  }

  const userDoc = await UserModel.findById(req.user.id);
  if (!userDoc) {
    throw new ApiError(404, 'User account not found.');
  }

  res.status(200).json({
    success: true,
    data: userDoc.toJSON(),
  });
};
