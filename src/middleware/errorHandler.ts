import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { ZodError } from 'zod';

export interface AppError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, any>;
}

export const errorHandler = (
  err: AppError | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = (err as AppError).statusCode || 500;
  let message = err.message || 'An unexpected internal server error occurred.';
  let errors: any[] | undefined = undefined;

  // Handle Zod Validation Errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed for request payload or parameters.';
    errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }

  // Handle MongoDB Duplicate Key Errors (E11000)
  else if ((err as AppError).code === 11000) {
    statusCode = 400;
    const field = Object.keys((err as AppError).keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists.`;
  }

  // Handle JWT Verification Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token signature.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token expired. Please log in again.';
  }

  if (statusCode === 500) {
    console.error('[Unhandled Internal Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found - ${req.method} ${req.originalUrl}`,
  });
};
