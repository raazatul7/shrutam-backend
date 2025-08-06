import { AppError } from '../types';

// Create custom error with status code
export function createError(statusCode: number, message: string, originalError?: any): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  
  if (originalError) {
    error.stack = originalError.stack;
  }
  
  return error;
}

// Handle async errors
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Check if error is operational
export function isOperationalError(error: Error): boolean {
  if (error instanceof Error) {
    return (error as AppError).isOperational || false;
  }
  return false;
} 