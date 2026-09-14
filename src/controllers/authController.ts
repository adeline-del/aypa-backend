import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { UserModel } from '../models/User';
import { BranchModel } from '../models/Branch';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';
import { generateToken } from '../utils/jwt';
import {
  findMockUserByEmail,
  findMockUserById,
  addMockUser,
  inMemoryUsers,
  inMemoryBranches,
} from '../utils/mockStore';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole, getPermissionsForRole } from '../config/permissions';
import {
  sendMemberRegistrationEmail,
  sendExecutivePendingApprovalEmail,
  sendPasswordResetEmail,
} from '../utils/emailService';

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

  // Resolve parish branch details if branchId is provided
  let effectiveBranchId = branchId || '';
  let effectiveArchdeaconryId = archdeaconryId || '';
  let effectiveDioceseId = dioceseId || 'accra';
  let branchName = church || '';

  if (effectiveBranchId) {
    if (config.useInMemoryMock) {
      const mockBranch = inMemoryBranches.find((b) => b.id === effectiveBranchId);
      if (mockBranch) {
        effectiveArchdeaconryId = effectiveArchdeaconryId || mockBranch.archdeaconryId;
        effectiveDioceseId = mockBranch.dioceseId || 'accra';
        branchName = mockBranch.name;
      }
    } else {
      const dbBranch = await BranchModel.findById(effectiveBranchId);
      if (dbBranch) {
        effectiveArchdeaconryId = effectiveArchdeaconryId || dbBranch.archdeaconryId;
        effectiveDioceseId = dbBranch.dioceseId || 'accra';
        branchName = dbBranch.name;
      }
    }
  }

  // Youth accounts auto-approved; Executive & Content Manager accounts require approval
  const isApproved = role === 'youth';

  // Initial appointment record if executive
  const isExecutiveRole = ['branch_executive', 'archdeaconry_executive', 'accra_diocesan_executive', 'content_manager'].includes(role);
  const initialAppointment = isExecutiveRole
    ? [
        {
          id: Date.now().toString(),
          role: role as UserRole,
          position: `${role.replace(/_/g, ' ')}`,
          dioceseId: effectiveDioceseId,
          archdeaconryId: effectiveArchdeaconryId,
          branchId: effectiveBranchId,
          startDate: new Date(),
          status: 'active' as const,
          reason: 'Initial Registration Appointment',
          createdAt: new Date(),
        },
      ]
    : [];

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
      church: branchName || church || '',
      phone: phone || '',
      dioceseId: effectiveDioceseId,
      archdeaconryId: effectiveArchdeaconryId,
      branchId: effectiveBranchId,
      profileImage: profileImage || '',
      memberSince: new Date().toISOString().split('T')[0],
      isApproved,
      isActive: true,
      permissions,
      tokenVersion: 0,
      appointmentHistory: initialAppointment,
    };

    addMockUser(newMockUser);

    const { passwordHash: _, ...safeMockUser } = newMockUser;

    // Send notifications asynchronously
    if (!isApproved) {
      sendExecutivePendingApprovalEmail({
        name,
        email: normalizedEmail,
        role,
        branchName,
      });

      res.status(201).json({
        success: true,
        message: 'Registration submitted successfully! Account pending executive approval by an administrator.',
        data: {
          user: safeMockUser,
        },
      });
      return;
    }

    sendMemberRegistrationEmail({
      name,
      email: normalizedEmail,
      branchName,
    });

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
    church: branchName || church || '',
    phone,
    dioceseId: effectiveDioceseId,
    archdeaconryId: effectiveArchdeaconryId,
    branchId: effectiveBranchId,
    profileImage,
    memberSince: new Date().toISOString().split('T')[0],
    isApproved,
    isActive: true,
    tokenVersion: 0,
    appointmentHistory: initialAppointment,
  });

  const userJSON = newUserDoc.toJSON();

  if (!isApproved) {
    sendExecutivePendingApprovalEmail({
      name,
      email: normalizedEmail,
      role,
      branchName,
    });

    res.status(201).json({
      success: true,
      message: 'Registration submitted successfully! Executive approval pending by an administrator.',
      data: {
        user: userJSON,
      },
    });
    return;
  }

  sendMemberRegistrationEmail({
    name,
    email: normalizedEmail,
    branchName,
  });

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

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const genericResponse = {
    success: true,
    message: 'If an account exists for that email address, a password reset link has been sent.',
  };

  // Generate 32-byte raw token and SHA-256 hashed version
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  if (config.useInMemoryMock) {
    const mockUser = findMockUserByEmail(normalizedEmail);
    if (mockUser) {
      (mockUser as any).resetPasswordToken = hashedToken;
      (mockUser as any).resetPasswordExpires = expiresAt;

      sendPasswordResetEmail({
        name: mockUser.name,
        email: mockUser.email,
        resetToken: rawToken,
      });
    }

    res.status(200).json(genericResponse);
    return;
  }

  const userDoc = await UserModel.findOne({ email: normalizedEmail });
  if (userDoc) {
    userDoc.resetPasswordToken = hashedToken;
    userDoc.resetPasswordExpires = expiresAt;
    await userDoc.save();

    sendPasswordResetEmail({
      name: userDoc.name,
      email: userDoc.email,
      resetToken: rawToken,
    });
  }

  res.status(200).json(genericResponse);
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    throw new ApiError(400, 'Token and new password are required.');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters.');
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  if (config.useInMemoryMock) {
    const mockUser = inMemoryUsers.find(
      (u: any) =>
        u.resetPasswordToken === hashedToken &&
        u.resetPasswordExpires &&
        new Date(u.resetPasswordExpires).getTime() > Date.now()
    );

    if (!mockUser) {
      throw new ApiError(400, 'Invalid or expired password reset token.');
    }

    mockUser.passwordHash = bcrypt.hashSync(newPassword, 10);
    delete (mockUser as any).resetPasswordToken;
    delete (mockUser as any).resetPasswordExpires;
    mockUser.tokenVersion = (mockUser.tokenVersion || 0) + 1;

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You may now sign in with your new password.',
    });
    return;
  }

  const userDoc = await UserModel.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password');

  if (!userDoc) {
    throw new ApiError(400, 'Invalid or expired password reset token.');
  }

  userDoc.password = newPassword;
  userDoc.resetPasswordToken = undefined;
  userDoc.resetPasswordExpires = undefined;
  userDoc.tokenVersion = (userDoc.tokenVersion || 0) + 1;
  await userDoc.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successfully. You may now sign in with your new password.',
  });
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const allowedFields = ['name', 'phone', 'profileImage', 'emergencyContact', 'communicationPreferences'];
  const updateData: Record<string, any> = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(req.user.id);
    if (!mockUser) {
      throw new ApiError(404, 'User account not found.');
    }
    Object.assign(mockUser, updateData);
    const { passwordHash: _, ...safeMockUser } = mockUser;
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: safeMockUser,
    });
    return;
  }

  const userDoc = await UserModel.findById(req.user.id);
  if (!userDoc) {
    throw new ApiError(404, 'User account not found.');
  }

  Object.assign(userDoc, updateData);
  await userDoc.save();

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully.',
    data: userDoc.toJSON(),
  });
};

export const changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new ApiError(400, 'Current password and new password are required.');
  }
  if (newPassword.length < 6) {
    throw new ApiError(400, 'New password must be at least 6 characters.');
  }

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(req.user.id);
    if (!mockUser || !bcrypt.compareSync(currentPassword, (mockUser as any).passwordHash)) {
      throw new ApiError(400, 'Incorrect current password.');
    }
    (mockUser as any).passwordHash = bcrypt.hashSync(newPassword, 10);
    mockUser.tokenVersion = (mockUser.tokenVersion || 0) + 1;

    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
    return;
  }

  const userDoc = await UserModel.findById(req.user.id).select('+password');
  if (!userDoc) {
    throw new ApiError(404, 'User account not found.');
  }

  const isValid = await userDoc.comparePassword(currentPassword);
  if (!isValid) {
    throw new ApiError(400, 'Incorrect current password.');
  }

  userDoc.password = newPassword;
  userDoc.tokenVersion = (userDoc.tokenVersion || 0) + 1;
  await userDoc.save();

  res.status(200).json({
    success: true,
    message: 'Password changed successfully.',
  });
};
