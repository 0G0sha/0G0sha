import "express";

declare global {
     namespace Express {
          export interface Request {
               user?: IUserRequest;
               lang?: string;
               clientIP?: any;
               geo?: any;
          }
     }
}

export { };
