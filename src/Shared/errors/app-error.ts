export class AppError extends Error {
     public readonly statusCode: number;
     public readonly isOperational: boolean;

     constructor(message: string, statusCode: number, isOperational = true) {
          super(message);
          this.statusCode = statusCode;
          this.isOperational = isOperational;
          Object.setPrototypeOf(this, AppError.prototype);
          Error.captureStackTrace(this, this.constructor);
     }

     static badRequest(message: string): AppError {
          return new AppError(message, 400);
     }

     static unauthorized(message = 'Unauthorized'): AppError {
          return new AppError(message, 401);
     }

     static notFound(message = 'Resource not found'): AppError {
          return new AppError(message, 404);
     }

     static conflict(message: string): AppError {
          return new AppError(message, 409);
     }

     static tooMany(message = 'Too many requests'): AppError {
          return new AppError(message, 429);
     }

     static internal(message = 'Internal server error'): AppError {
          return new AppError(message, 500, false);
     }
}
