import type { Request, Response, NextFunction } from 'express';
import { AppError } from './app-error';
import { logger } from '../../utils/logger';

export const errorHandler = (
     err: Error,
     _req: Request,
     res: Response,
     _next: NextFunction,
): void => {
     if (err instanceof AppError) {
          if (!err.isOperational) {
               logger.error({ err }, 'Non-operational error');
          }

          res.status(err.statusCode).json({
               success: false,
               message: err.message,
          });
          return;
     }

     // Mongoose validation error
     if (err.name === 'ValidationError') {
          res.status(422).json({
               success: false,
               message: 'Validation failed',
               ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
          });
          return;
     }

     // Mongoose duplicate key
     if (err.name === 'MongoServerError' && (err as any).code === 11000) {
          res.status(409).json({
               success: false,
               message: 'Duplicate entry',
          });
          return;
     }

     // Unknown error — never expose stack trace
     logger.error({ err }, 'Unhandled error');
     res.status(500).json({
          success: false,
          message: 'Internal server error',
     });
};
