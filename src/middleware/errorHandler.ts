import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types';

// Create custom error
export function createError(statusCode: number, message: string, originalError?: any): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  
  if (originalError) {
    error.stack = originalError.stack;
  }
  
  return error;
}

// Error handling middleware
export default function errorHandler(
  error: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Handle custom AppError
  if ((error as AppError).statusCode) {
    statusCode = (error as AppError).statusCode;
    message = error.message;
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  } else if ((error as any).code === '23505') { // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if ((error as any).code === '23503') { // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
  }

  // Log error in development
  if (process.env['NODE_ENV'] === 'development') {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      statusCode,
      url: req.url,
      method: req.method
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      statusCode,
      ...(process.env['NODE_ENV'] === 'development' && {
        stack: error.stack,
        details: error.message
      })
    }
  });
} 