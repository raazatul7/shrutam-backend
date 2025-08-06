import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createError } from './errorHandler';

// UUID validation schema
const uuidSchema = Joi.string().uuid().required();

// Quote ID validation middleware
export function validateQuoteId(req: Request, _res: Response, next: NextFunction): void {
  const { error } = uuidSchema.validate(req.params['id']);
  
  if (error) {
    return next(createError(400, 'Invalid quote ID format'));
  }
  
  next();
}

// Pagination validation schema
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional()
});

// Pagination validation middleware
export function validatePagination(req: Request, _res: Response, next: NextFunction): void {
  const { error } = paginationSchema.validate(req.query);
  
  if (error) {
    return next(createError(400, 'Invalid pagination parameters'));
  }
  
  next();
}

// Generic validation middleware
export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return next(createError(400, `Validation error: ${errorMessage}`));
    }
    
    next();
  };
} 