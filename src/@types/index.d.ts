import { ProjectionType, QueryOptions } from "mongoose";

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
