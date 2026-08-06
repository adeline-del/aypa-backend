import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: 'youth' | 'executive';
  };
}

export const authenticate = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new ApiError(401, 'Unauthorized access. Authentication token required.');
  }

  const token = authHeader.substring(7);

  if (!token.startsWith('token_')) {
    throw new ApiError(401, 'Invalid or expired authorization token.');
  }

  const tokenParts = token.split('_');

  if (tokenParts.length < 3) {
    throw new ApiError(401, 'Invalid authentication token.');
  }

  const userId = tokenParts[1];

  req.user = {
    id: userId,
  };

  next();
};

export const requireAuth = authenticate;