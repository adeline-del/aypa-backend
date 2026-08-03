import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error Handler] ${statusCode} - ${message}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Endpoint not found - ${req.originalUrl}`,
  });
};
