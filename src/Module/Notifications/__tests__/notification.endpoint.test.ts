import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createTestApp } from '../../../__tests__/helpers/test-app'
import { AppError } from '../../../Shared/errors/app-error'

// ─── Infrastructure mocks (prevent real Redis / BullMQ connections) ───────────
vi.mock('../../../config/redis', () => ({
     default: { on: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
     redisConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../MessageQueue/Queue/queue.email', () => ({
     queue: { add: vi.fn(), on: vi.fn(), close: vi.fn() },
     addJobToQueue: vi.fn().mockResolvedValue(undefined),
}))

// ─── Socket mock (breaks circular dep: gen-import → socket → app) ─────────────
vi.mock('../../../socket', () => ({
     socketFunction: vi.fn(),
     getNotificationNamespace: vi.fn(),
}))

// ─── Rate limiter bypass ──────────────────────────────────────────────────────
vi.mock('../../../utils/limit-request', () => ({
     authlimiter: (_req: any, _res: any, next: any) => next(),
     limiter: (_req: any, _res: any, next: any) => next(),
}))

// ─── userMiddleware: bypass PASETO + DB lookup ────────────────────────────────
vi.mock('../../../middleware/user.middleware', () => ({
     userMiddleware: vi.fn((req: any, res: any, next: any) => {
          const auth = req.headers.authorization
          if (!auth || !auth.startsWith('Bearer ')) {
               res.status(401).json({ message: 'Please login first' })
               return
          }
          req.user = mockUser
          next()
     }),
}))

// ─── Service mocks ───────────────────────────────────────────────────────────
const {
     mockGetNotifications,
     mockMarkSeen,
     mockMarkAllSeen,
     mockPublishNotification,
     mockRegisterClient,
} = vi.hoisted(() => ({
     mockGetNotifications: vi.fn(),
     mockMarkSeen: vi.fn(),
     mockMarkAllSeen: vi.fn(),
     mockPublishNotification: vi.fn(),
     mockRegisterClient: vi.fn(),
}))

vi.mock('../Service/notification-history.service', () => ({
     NotificationHistoryService: vi.fn().mockImplementation(() => ({
          getNotifications: mockGetNotifications,
          markSeen: mockMarkSeen,
          markAllSeen: mockMarkAllSeen,
     })),
}))

vi.mock('../Service/public.service', () => ({
     publishNotification: mockPublishNotification,
}))

vi.mock('../Service/register.service', () => ({
     registerClient: mockRegisterClient,
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const BASE = '/api/v1/notifications'
const AUTH_HEADER = 'Bearer valid.token.here'

const mockUser = {
     _id: '507f1f77bcf86cd799439011',
}

const mockNotification = {
     _id: '60d5ec49f1b2c72d9c8b4567',
     userId: mockUser._id,
     type: 'system',
     title: 'Test notification',
     message: 'This is a test',
     seen: false,
     seenAt: null,
     createdAt: '2026-01-01T00:00:00.000Z',
}

// ─── App setup ────────────────────────────────────────────────────────────────
let app: Express

beforeAll(() => {
     app = createTestApp()
})

beforeEach(() => {
     vi.clearAllMocks()
})

// ─── POST /notifications/publish ──────────────────────────────────────────────
describe(`POST ${BASE}/publish`, () => {

     // ── Auth guard ───────────────────────────────────────────────────────────

     it('returns 401 when Authorization header is missing', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .send({ type: 'system', title: 'Hi', message: 'Hello' })
          expect(res.status).toBe(401)
     })

     it('returns 401 when token format is invalid', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', 'InvalidToken')
               .send({ type: 'system', title: 'Hi', message: 'Hello' })
          expect(res.status).toBe(401)
     })

     // ── DTO validation ──────────────────────────────────────────────────────

     it('returns 400 when body is empty', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({})
          expect(res.status).toBe(400)
     })

     it('returns 400 when type is missing', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({ title: 'Hi', message: 'Hello' })
          expect(res.status).toBe(400)
     })

     it('returns 400 when type is invalid', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({ type: 'invalid', title: 'Hi', message: 'Hello' })
          expect(res.status).toBe(400)
     })

     it('returns 400 when title is missing', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({ type: 'system', message: 'Hello' })
          expect(res.status).toBe(400)
     })

     it('returns 400 when title is empty string', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({ type: 'system', title: '', message: 'Hello' })
          expect(res.status).toBe(400)
     })

     it('returns 400 when message is missing', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({ type: 'system', title: 'Hi' })
          expect(res.status).toBe(400)
     })

     it('returns 400 when message is empty string', async () => {
          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({ type: 'system', title: 'Hi', message: '' })
          expect(res.status).toBe(400)
     })

     // ── Success ─────────────────────────────────────────────────────────────

     it('returns 200 with payload on success', async () => {
          mockPublishNotification.mockResolvedValue(undefined)

          const res = await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({ type: 'system', title: 'Hi', message: 'Hello world' })

          expect(res.status).toBe(200)
          expect(res.body.success).toBe(true)
          expect(res.body.data).toMatchObject({
               type: 'system',
               title: 'Hi',
               message: 'Hello world',
          })
          expect(res.body.data.id).toBeDefined()
          expect(res.body.data.createdAt).toBeDefined()
     })

     it('calls publishNotification with userId and payload', async () => {
          mockPublishNotification.mockResolvedValue(undefined)

          await request(app)
               .post(`${BASE}/publish`)
               .set('Authorization', AUTH_HEADER)
               .send({ type: 'comment', title: 'New comment', message: 'Someone commented' })

          expect(mockPublishNotification).toHaveBeenCalledOnce()
          expect(mockPublishNotification).toHaveBeenCalledWith(
               mockUser._id,
               expect.objectContaining({
                    type: 'comment',
                    title: 'New comment',
                    message: 'Someone commented',
               }),
          )
     })

     it('accepts all valid notification types', async () => {
          mockPublishNotification.mockResolvedValue(undefined)

          for (const type of ['upload', 'comment', 'like', 'system']) {
               const res = await request(app)
                    .post(`${BASE}/publish`)
                    .set('Authorization', AUTH_HEADER)
                    .send({ type, title: 'Test', message: 'Test message' })

               expect(res.status).toBe(200)
          }
     })
})

// ─── GET /notifications ───────────────────────────────────────────────────────
// NOTE: validateDTO validates req.body, but this is a GET route reading from
// req.query. Sending Content-Type: application/json with an empty body ({})
// so the JSON parser populates req.body and validateDTO passes.
describe(`GET ${BASE}/`, () => {

     // ── Auth guard ───────────────────────────────────────────────────────────

     it('returns 401 when Authorization header is missing', async () => {
          const res = await request(app).get(BASE).send({})
          expect(res.status).toBe(401)
     })

     // ── Success ─────────────────────────────────────────────────────────────

     it('returns 200 with paginated notifications', async () => {
          const serviceResult = {
               data: [mockNotification],
               meta: {
                    total: 1,
                    unseen: 1,
                    page: 1,
                    limit: 10,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false,
               },
          }
          mockGetNotifications.mockResolvedValue(serviceResult)

          const res = await request(app)
               .get(BASE)
               .set('Authorization', AUTH_HEADER)
               .send({})

          expect(res.status).toBe(200)
          expect(res.body.success).toBe(true)
          expect(res.body.data).toEqual(serviceResult.data)
          expect(res.body.meta).toEqual(serviceResult.meta)
     })

     it('passes query parameters to service', async () => {
          mockGetNotifications.mockResolvedValue({
               data: [],
               meta: { total: 0, unseen: 0, page: 2, limit: 5, totalPages: 0, hasNext: false, hasPrev: true },
          })

          await request(app)
               .get(`${BASE}?page=2&limit=5&seen=true`)
               .set('Authorization', AUTH_HEADER)
               .send({})

          expect(mockGetNotifications).toHaveBeenCalledOnce()
          // Query params arrive as strings from Express; controller passes them as-is
          expect(mockGetNotifications).toHaveBeenCalledWith(
               mockUser._id,
               expect.objectContaining({ page: '2', limit: '5', seen: 'true' }),
          )
     })

     it('returns 200 with empty list when no notifications exist', async () => {
          mockGetNotifications.mockResolvedValue({
               data: [],
               meta: { total: 0, unseen: 0, page: 1, limit: 10, totalPages: 0, hasNext: false, hasPrev: false },
          })

          const res = await request(app)
               .get(BASE)
               .set('Authorization', AUTH_HEADER)
               .send({})

          expect(res.status).toBe(200)
          expect(res.body.data).toEqual([])
     })
})

// ─── PATCH /notifications/seen-all ────────────────────────────────────────────
describe(`PATCH ${BASE}/seen-all`, () => {

     // ── Auth guard ───────────────────────────────────────────────────────────

     it('returns 401 when Authorization header is missing', async () => {
          const res = await request(app).patch(`${BASE}/seen-all`)
          expect(res.status).toBe(401)
     })

     // ── Success ─────────────────────────────────────────────────────────────

     it('returns 200 with updated count', async () => {
          mockMarkAllSeen.mockResolvedValue({ updated: 5 })

          const res = await request(app)
               .patch(`${BASE}/seen-all`)
               .set('Authorization', AUTH_HEADER)

          expect(res.status).toBe(200)
          expect(res.body).toMatchObject({
               success: true,
               data: { updated: 5 },
          })
     })

     it('calls markAllSeen with the correct userId', async () => {
          mockMarkAllSeen.mockResolvedValue({ updated: 0 })

          await request(app)
               .patch(`${BASE}/seen-all`)
               .set('Authorization', AUTH_HEADER)

          expect(mockMarkAllSeen).toHaveBeenCalledOnce()
          expect(mockMarkAllSeen).toHaveBeenCalledWith(mockUser._id)
     })

     it('returns updated: 0 when no unseen notifications', async () => {
          mockMarkAllSeen.mockResolvedValue({ updated: 0 })

          const res = await request(app)
               .patch(`${BASE}/seen-all`)
               .set('Authorization', AUTH_HEADER)

          expect(res.status).toBe(200)
          expect(res.body.data.updated).toBe(0)
     })
})

// ─── PATCH /notifications/:id/seen ────────────────────────────────────────────
describe(`PATCH ${BASE}/:id/seen`, () => {
     const notificationId = '60d5ec49f1b2c72d9c8b4567'

     // ── Auth guard ───────────────────────────────────────────────────────────

     it('returns 401 when Authorization header is missing', async () => {
          const res = await request(app).patch(`${BASE}/${notificationId}/seen`)
          expect(res.status).toBe(401)
     })

     // ── Business logic ─────────────────────────────────────────────────────

     it('returns 404 when notification is not found', async () => {
          mockMarkSeen.mockRejectedValue(AppError.notFound('Notification not found'))

          const res = await request(app)
               .patch(`${BASE}/${notificationId}/seen`)
               .set('Authorization', AUTH_HEADER)

          expect(res.status).toBe(404)
     })

     it('returns 200 with updated notification on success', async () => {
          const seenNotification = { ...mockNotification, seen: true, seenAt: '2026-01-01T01:00:00.000Z' }
          mockMarkSeen.mockResolvedValue(seenNotification)

          const res = await request(app)
               .patch(`${BASE}/${notificationId}/seen`)
               .set('Authorization', AUTH_HEADER)

          expect(res.status).toBe(200)
          expect(res.body).toMatchObject({
               success: true,
               data: expect.objectContaining({ seen: true }),
          })
     })

     it('calls markSeen with the correct userId and notificationId', async () => {
          mockMarkSeen.mockResolvedValue({ ...mockNotification, seen: true })

          await request(app)
               .patch(`${BASE}/${notificationId}/seen`)
               .set('Authorization', AUTH_HEADER)

          expect(mockMarkSeen).toHaveBeenCalledOnce()
          expect(mockMarkSeen).toHaveBeenCalledWith(mockUser._id, notificationId)
     })
})

// ─── GET /notifications/stream (SSE) ──────────────────────────────────────────
describe(`GET ${BASE}/stream`, () => {

     it('returns 401 when Authorization header is missing', async () => {
          const res = await request(app).get(`${BASE}/stream`)
          expect(res.status).toBe(401)
     })

     it('establishes SSE connection with correct headers', async () => {
          // Mock registerClient to end the response so supertest can complete
          mockRegisterClient.mockImplementation(async (_userId: string, res: any) => {
               res.end()
          })

          const res = await request(app)
               .get(`${BASE}/stream`)
               .set('Authorization', AUTH_HEADER)

          expect(res.status).toBe(200)
          expect(res.headers['content-type']).toBe('text/event-stream')
          expect(res.headers['cache-control']).toBe('no-cache')
     })

     it('calls registerClient with the userId and response', async () => {
          mockRegisterClient.mockImplementation(async (_userId: string, res: any) => {
               res.end()
          })

          await request(app)
               .get(`${BASE}/stream`)
               .set('Authorization', AUTH_HEADER)

          expect(mockRegisterClient).toHaveBeenCalledOnce()
          expect(mockRegisterClient).toHaveBeenCalledWith(
               mockUser._id,
               expect.any(Object), // Express Response
               undefined,
          )
     })

     it('passes Last-Event-ID header to registerClient', async () => {
          mockRegisterClient.mockImplementation(async (_userId: string, res: any) => {
               res.end()
          })

          await request(app)
               .get(`${BASE}/stream`)
               .set('Authorization', AUTH_HEADER)
               .set('last-event-id', 'event-42')

          expect(mockRegisterClient).toHaveBeenCalledWith(
               mockUser._id,
               expect.any(Object),
               'event-42',
          )
     })
})
