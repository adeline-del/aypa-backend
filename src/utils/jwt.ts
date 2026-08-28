import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config/env';
import { UserRole } from '../config/permissions';
import { ApiError } from './ApiError';

export interface TokenPayload {
  id: string;
  role: UserRole;
  tokenVersion?: number;
}

export const generateToken = (payload: TokenPayload): string => {
  const options: SignOptions = {
    expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwtSecret, options);
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    if (!decoded || !decoded.id || !decoded.role) {
      throw new ApiError(401, 'Invalid authentication token payload.');
    }
    return decoded;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Authentication token has expired. Please log in again.');
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(401, 'Invalid authentication token.');
  }
};
