import type { Request } from 'express'
import type { ProjectionType, QueryOptions, Types } from 'mongoose'

export interface PaginationParams {
     page?: number;
     limit?: number;
}

export interface PaginationMeta {
     total: number;
     page: number;
     limit: number;
     totalPages: number;
     hasNext: boolean;
     hasPrev: boolean;
}

export interface PaginatedResult<T> {
     data: T[];
     meta: PaginationMeta;
}

export interface PaginateOptions<T> {
     filter?: any;
     projection?: ProjectionType<T>;
     options?: QueryOptions<T>;
     params?: PaginationParams;
}

export interface IUserRequest extends Request {
     _id?: Types.ObjectId | string;
     fullname?: string;
     username?: string;
     email?: string;
     avatar?: string;
     apiKey?: string;
     plan?: 'free' | 'starter' | 'pro' | 'enterprise';
     tokens?: any;
     subscription?: Types.ObjectId;
}
