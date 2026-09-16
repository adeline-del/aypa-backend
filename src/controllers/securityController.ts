import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { config } from '../config/env';
import { inMemoryUsers } from '../utils/mockStore';

export const revokeAllSessions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  if (!req.user || req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Access denied. Only Super Admin can perform emergency session revocation.');
  }

  if (config.useInMemoryMock) {
    inMemoryUsers.forEach((user) => {
      user.tokenVersion = (user.tokenVersion || 0) + 1;
    });
  } else {
    // Atomically increment tokenVersion for ALL users in MongoDB
    await UserModel.updateMany({}, { $inc: { tokenVersion: 1 } });
  }

  res.status(200).json({
    success: true,
    message: 'Active sessions revoked successfully. All users must sign in again.',
    timestamp: new Date().toISOString(),
  });
};
