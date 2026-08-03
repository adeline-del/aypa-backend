import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'youth' | 'executive';
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Unauthorized access. Authentication token required.');
  }

  const token = authHeader.split(' ')[1];

  // Simple token decoding check / mock session token handling
  if (token === 'mock-jwt-token' || token.startsWith('token_')) {
    req.user = {
      id: '1',
      email: 'sarah@example.com',
      role: 'youth',
    };
    next();
    return;
  }

  throw new ApiError(401, 'Invalid or expired authorization token.');
};

export const requireAuth = authenticate;
