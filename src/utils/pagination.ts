import type { Document, Model } from 'mongoose'
import type { PaginatedResult, PaginateOptions, PaginationParams } from '@/@types'

/**
 * Clamps page/limit to safe values and returns skip offset.
 */
export const normalizePagination = (
  params: PaginationParams = {},
): { page: number; limit: number; skip: number } => {
  const page = Math.max(1, Math.floor(Number(params.page) || 1))
  const limit = Math.min(100, Math.max(1, Math.floor(Number(params.limit) || 10)))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

/**
 * Generic paginate function for any Mongoose model.
 *
 * @example
 *   const result = await paginate(UserModel, {
 *     filter: { isActive: true },
 *     projection: { password: 0 },
 *     options: { sort: { createdAt: -1 } },
 *     params: { page: 2, limit: 20 },
 *   });
 */
export const paginate = async <T extends Document>(
  model: Model<T>,
  { filter = {}, projection, options = {}, params }: PaginateOptions<T> = {},
): Promise<PaginatedResult<T>> => {
  const { page, limit, skip } = normalizePagination(params)

  const [data, total] = await Promise.all([
    model
      .find(filter, projection, { ...options, skip, limit })
      .lean<T[]>({ virtuals: false }),
    model.countDocuments(filter),
  ])

  const totalPages = Math.ceil(total / limit)

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  }
}
