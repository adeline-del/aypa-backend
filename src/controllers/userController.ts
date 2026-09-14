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

import { sendExecutiveAppointmentEmail, sendTenureChangeEmail } from '../utils/emailService';

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

export const endExecutiveAppointment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const { reason } = req.body;

  const defaultReason = reason || 'Executive tenure ended (2-Year Term Completed)';

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);
    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (!canManageUser(req, mockUser)) {
      throw new ApiError(403, 'Access denied. You cannot manage users outside your scope.');
    }

    const previousRole = mockUser.role;

    // Close any active appointment in history
    if (!mockUser.appointmentHistory) {
      mockUser.appointmentHistory = [];
    }

    mockUser.appointmentHistory.forEach((appt) => {
      if (appt.status === 'active' || appt.status === 'renewed') {
        appt.status = 'ended';
        appt.endDate = new Date();
        appt.reason = defaultReason;
        appt.authorizedBy = req.user?.id;
      }
    });

    // Record formal completion entry
    mockUser.appointmentHistory.push({
      id: Date.now().toString(),
      role: previousRole,
      position: `${previousRole.replace(/_/g, ' ')} (Concluded)`,
      dioceseId: mockUser.dioceseId,
      archdeaconryId: mockUser.archdeaconryId,
      branchId: mockUser.branchId,
      startDate: new Date(),
      endDate: new Date(),
      status: 'ended',
      reason: defaultReason,
      authorizedBy: req.user?.id,
      createdAt: new Date(),
    });

    // Transition user to regular youth member
    mockUser.role = 'youth';
    mockUser.permissions = getPermissionsForRole('youth');
    mockUser.tokenVersion = (mockUser.tokenVersion || 0) + 1;

    const { passwordHash: _, ...safeMockUser } = mockUser;

    res.status(200).json({
      success: true,
      message: `Executive tenure ended successfully. Role changed from '${previousRole}' to 'youth'.`,
      data: safeMockUser,
    });
    return;
  }

  const userDoc = await UserModel.findById(id);
  if (!userDoc) {
    throw new ApiError(404, 'User not found.');
  }

  if (!canManageUser(req, userDoc)) {
    throw new ApiError(403, 'Access denied. You cannot manage users outside your scope.');
  }

  const previousRole = userDoc.role;

  if (!userDoc.appointmentHistory) {
    userDoc.appointmentHistory = [];
  }

  userDoc.appointmentHistory.forEach((appt) => {
    if (appt.status === 'active' || appt.status === 'renewed') {
      appt.status = 'ended';
      appt.endDate = new Date();
      appt.reason = defaultReason;
      appt.authorizedBy = req.user?.id;
    }
  });

  userDoc.appointmentHistory.push({
    id: Date.now().toString(),
    role: previousRole,
    position: `${previousRole.replace(/_/g, ' ')} (Concluded)`,
    dioceseId: userDoc.dioceseId,
    archdeaconryId: userDoc.archdeaconryId,
    branchId: userDoc.branchId,
    startDate: new Date(),
    endDate: new Date(),
    status: 'ended',
    reason: defaultReason,
    authorizedBy: req.user?.id,
    createdAt: new Date(),
  });

  userDoc.role = 'youth';
  userDoc.permissions = getPermissionsForRole('youth');
  userDoc.tokenVersion = (userDoc.tokenVersion || 0) + 1;

  await userDoc.save();

  sendTenureChangeEmail({
    name: userDoc.name,
    email: userDoc.email,
    newRole: 'youth',
    reason: defaultReason,
  }).catch((err) => console.error('[Tenure Change Email Error]:', err));

  res.status(200).json({
    success: true,
    message: `Executive tenure ended successfully. Role changed from '${previousRole}' to 'youth'.`,
    data: userDoc.toJSON(),
  });
};

export const renewExecutiveAppointment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const { position, reason, durationYears } = req.body;

  const years = durationYears || 2;
  const renewalReason = reason || `Executive appointment renewed for ${years} years`;
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + years);

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);
    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (!canManageUser(req, mockUser)) {
      throw new ApiError(403, 'Access denied. You cannot manage users outside your scope.');
    }

    if (!mockUser.appointmentHistory) {
      mockUser.appointmentHistory = [];
    }

    const newAppointment = {
      id: Date.now().toString(),
      role: mockUser.role,
      position: position || `${mockUser.role.replace(/_/g, ' ')}`,
      dioceseId: mockUser.dioceseId,
      archdeaconryId: mockUser.archdeaconryId,
      branchId: mockUser.branchId,
      startDate: new Date(),
      endDate,
      status: 'renewed' as const,
      reason: renewalReason,
      authorizedBy: req.user.id,
      createdAt: new Date(),
    };

    mockUser.appointmentHistory.push(newAppointment);
    mockUser.tokenVersion = (mockUser.tokenVersion || 0) + 1;

    const { passwordHash: _, ...safeMockUser } = mockUser;

    res.status(200).json({
      success: true,
      message: `Executive tenure renewed successfully until ${endDate.toISOString().split('T')[0]}.`,
      data: safeMockUser,
    });
    return;
  }

  const userDoc = await UserModel.findById(id);
  if (!userDoc) {
    throw new ApiError(404, 'User not found.');
  }

  if (!canManageUser(req, userDoc)) {
    throw new ApiError(403, 'Access denied. You cannot manage users outside your scope.');
  }

  if (!userDoc.appointmentHistory) {
    userDoc.appointmentHistory = [];
  }

  userDoc.appointmentHistory.push({
    id: Date.now().toString(),
    role: userDoc.role,
    position: position || `${userDoc.role.replace(/_/g, ' ')}`,
    dioceseId: userDoc.dioceseId,
    archdeaconryId: userDoc.archdeaconryId,
    branchId: userDoc.branchId,
    startDate: new Date(),
    endDate,
    status: 'renewed',
    reason: renewalReason,
    authorizedBy: req.user.id,
    createdAt: new Date(),
  });

  userDoc.tokenVersion = (userDoc.tokenVersion || 0) + 1;
  await userDoc.save();

  res.status(200).json({
    success: true,
    message: `Executive tenure renewed successfully until ${endDate.toISOString().split('T')[0]}.`,
    data: userDoc.toJSON(),
  });
};

export const getUserAppointments = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);
    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (!canManageUser(req, mockUser) && req.user.id !== mockUser.id) {
      throw new ApiError(403, 'Access denied.');
    }

    res.status(200).json({
      success: true,
      data: mockUser.appointmentHistory || [],
    });
    return;
  }

  const userDoc = await UserModel.findById(id);
  if (!userDoc) {
    throw new ApiError(404, 'User not found.');
  }

  if (!canManageUser(req, userDoc) && req.user.id !== userDoc.id) {
    throw new ApiError(403, 'Access denied.');
  }

  res.status(200).json({
    success: true,
    data: userDoc.appointmentHistory || [],
  });
};

export const assignExecutiveAppointment = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user) {
    throw new ApiError(401, 'Authentication required.');
  }

  const { id } = req.params;
  const {
    role,
    position,
    dioceseId,
    archdeaconryId,
    branchId,
    startDate,
    endDate,
    reason,
    notes,
  } = req.body;

  if (!role) {
    throw new ApiError(400, 'Executive role is required.');
  }

  // Prevent assigning administrative super-user roles or youth
  if (role === 'admin' || role === 'super_admin' || role === 'youth') {
    throw new ApiError(
      400,
      'Invalid role for executive appointment. Role must be an executive leadership role.'
    );
  }

  // Validate admin authority over selected role
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    if (req.user.role === 'branch_executive' && (role === 'archdeaconry_executive' || role === 'accra_diocesan_executive')) {
      throw new ApiError(403, 'Branch executives cannot assign higher-scope executive roles.');
    }
    if (req.user.role === 'archdeaconry_executive' && role === 'accra_diocesan_executive') {
      throw new ApiError(403, 'Archdeaconry executives cannot assign Diocesan executive roles.');
    }
  }

  const start = startDate ? new Date(startDate) : new Date();
  let end: Date;
  if (endDate) {
    end = new Date(endDate);
  } else {
    end = new Date(start);
    end.setFullYear(end.getFullYear() + 2); // Default 2-year tenure
  }

  if (end.getTime() <= start.getTime()) {
    throw new ApiError(400, 'End date must be after start date.');
  }

  const appointmentReason = reason || `Executive appointment assigned as ${role.replace(/_/g, ' ')}`;

  if (config.useInMemoryMock) {
    const mockUser = findMockUserById(id);
    if (!mockUser) {
      throw new ApiError(404, 'User not found.');
    }

    if (!canManageUser(req, mockUser)) {
      throw new ApiError(403, 'Access denied. You cannot manage users outside your scope.');
    }

    const proposedBranchId = branchId !== undefined ? branchId : mockUser.branchId;
    const proposedArchId = archdeaconryId !== undefined ? archdeaconryId : mockUser.archdeaconryId;
    const proposedDioceseId = dioceseId || mockUser.dioceseId || 'accra';

    if (!mockUser.appointmentHistory) {
      mockUser.appointmentHistory = [];
    }

    // Check for existing active appointment to prevent duplicates
    const activeAppt = mockUser.appointmentHistory.find((a) => a.status === 'active');
    if (activeAppt && !req.body.overwrite && !req.body.force) {
      throw new ApiError(
        409,
        `User already holds an active executive appointment ('${activeAppt.position || activeAppt.role}'). Please conclude or end the current appointment before assigning a new one.`,
      );
    }

    if (activeAppt && (req.body.overwrite || req.body.force)) {
      activeAppt.status = 'ended';
      activeAppt.endedAt = new Date();
      activeAppt.endedBy = req.user.id;
      activeAppt.reason = activeAppt.reason ? `${activeAppt.reason} (Replaced by new appointment)` : 'Replaced by new appointment';
    }

    const newAppointment = {
      id: Date.now().toString(),
      role: role as UserRole,
      position: position || role.replace(/_/g, ' '),
      dioceseId: proposedDioceseId,
      archdeaconryId: proposedArchId,
      branchId: proposedBranchId,
      startDate: start,
      endDate: end,
      status: 'active' as const,
      reason: appointmentReason,
      notes: notes || '',
      authorizedBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUser.appointmentHistory.push(newAppointment);
    mockUser.role = role as UserRole;
    if (proposedBranchId !== undefined) mockUser.branchId = proposedBranchId;
    if (proposedArchId !== undefined) mockUser.archdeaconryId = proposedArchId;
    if (proposedDioceseId) mockUser.dioceseId = proposedDioceseId;
    mockUser.permissions = getPermissionsForRole(role as UserRole);
    mockUser.isApproved = true;
    mockUser.isActive = true;
    mockUser.tokenVersion = (mockUser.tokenVersion || 0) + 1;

    const { passwordHash: _, ...safeMockUser } = mockUser;

    sendExecutiveAppointmentEmail({
      name: mockUser.name,
      email: mockUser.email,
      role: mockUser.role,
      position: newAppointment.position,
      scope: mockUser.church || 'Accra Diocese',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    }).catch((err) => console.error('Email notification failed:', err));

    res.status(200).json({
      success: true,
      message: `Executive appointment assigned successfully for ${mockUser.name}.`,
      data: safeMockUser,
    });
    return;
  }

  const userDoc = await UserModel.findById(id);
  if (!userDoc) {
    throw new ApiError(404, 'User not found.');
  }

  if (!canManageUser(req, userDoc)) {
    throw new ApiError(403, 'Access denied. You cannot manage users outside your scope.');
  }

  const proposedBranchId = branchId !== undefined ? branchId : userDoc.branchId;
  const proposedArchId = archdeaconryId !== undefined ? archdeaconryId : userDoc.archdeaconryId;
  const proposedDioceseId = dioceseId || userDoc.dioceseId || 'accra';

  if (!userDoc.appointmentHistory) {
    userDoc.appointmentHistory = [];
  }

  const activeAppt = userDoc.appointmentHistory.find((a) => a.status === 'active');
  if (activeAppt && !req.body.overwrite && !req.body.force) {
    throw new ApiError(
      409,
      `User already holds an active executive appointment ('${activeAppt.position || activeAppt.role}'). Please conclude or end the current appointment before assigning a new one.`,
    );
  }

  if (activeAppt && (req.body.overwrite || req.body.force)) {
    activeAppt.status = 'ended';
    activeAppt.endedAt = new Date();
    activeAppt.endedBy = req.user.id;
    activeAppt.reason = activeAppt.reason ? `${activeAppt.reason} (Replaced by new appointment)` : 'Replaced by new appointment';
  }

  const newAppointment = {
    id: Date.now().toString(),
    role: role as UserRole,
    position: position || role.replace(/_/g, ' '),
    dioceseId: proposedDioceseId,
    archdeaconryId: proposedArchId,
    branchId: proposedBranchId,
    startDate: start,
    endDate: end,
    status: 'active' as const,
    reason: appointmentReason,
    notes: notes || '',
    authorizedBy: req.user.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  userDoc.appointmentHistory.push(newAppointment);
  userDoc.role = role as UserRole;
  if (proposedBranchId !== undefined) userDoc.branchId = proposedBranchId;
  if (proposedArchId !== undefined) userDoc.archdeaconryId = proposedArchId;
  if (proposedDioceseId) userDoc.dioceseId = proposedDioceseId;
  userDoc.permissions = getPermissionsForRole(role as UserRole);
  userDoc.isApproved = true;
  userDoc.isActive = true;
  userDoc.tokenVersion = (userDoc.tokenVersion || 0) + 1;

  await userDoc.save();

  sendExecutiveAppointmentEmail({
    name: userDoc.name,
    email: userDoc.email,
    role: userDoc.role,
    position: newAppointment.position,
    scope: userDoc.church || 'Accra Diocese',
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  }).catch((err) => console.error('Email notification failed:', err));

  res.status(200).json({
    success: true,
    message: `Executive appointment assigned successfully for ${userDoc.name}.`,
    data: userDoc.toJSON(),
  });
};