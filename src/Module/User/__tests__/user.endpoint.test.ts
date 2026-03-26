import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createTestApp } from '../../../__tests__/helpers/test-app'

// ─── Infrastructure mocks ────────────────────────────────────────────────────
vi.mock('../../../config/redis', () => ({
     default: { on: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
     redisConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../MessageQueue/Queue/queue.email', () => ({
     queue: { add: vi.fn(), on: vi.fn(), close: vi.fn() },
     addJobToQueue: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../utils/limit-request', () => ({
     authlimiter: (_req: any, _res: any, next: any) => next(),
     limiter: (_req: any, _res: any, next: any) => next(),
}))

// ─── Cloudinary: bypass multer + uploadToCloudinary ─────────────────────────
const { mockUploadToCloudinary } = vi.hoisted(() => ({
     mockUploadToCloudinary: vi.fn(),
}))

vi.mock('../../../Providers/cloudinary.provider', () => ({
     upload: {
          single: vi.fn((fieldName: string) => (req: any, _res: any, next: any) => {
               // Simulate multer: ensure body exists and attach req.file when multipart
               req.body = req.body ?? {}
               if (req.headers['content-type']?.includes('multipart')) {
                    req.file = {
                         fieldname: fieldName,
                         originalname: 'avatar.jpg',
                         buffer: Buffer.from('fake-image-data'),
                         mimetype: 'image/jpeg',
                         size: 15,
                    }
               }
               next()
          }),
     },
     uploadToCloudinary: mockUploadToCloudinary,
}))

// ─── profileMiddleware: bypass PASETO + DB lookup ────────────────────────────
vi.mock('../middleware', () => ({
     profileMiddleware: vi.fn((req: any, res: any, next: any) => {
          const auth = req.headers.authorization
          if (!auth || !auth.startsWith('Bearer ')) {
               res.status(401).json({ message: 'Please login first' })
               return
          }
          req.user = mockUser
          next()
     }),
}))

// ─── Service mock ─────────────────────────────────────────────────────────────
const { mockEditProfile, mockDeleteAccount } = vi.hoisted(() => ({
     mockEditProfile: vi.fn(),
     mockDeleteAccount: vi.fn(),
}))

vi.mock('../Service/based-user.service', () => ({
     BasedUserService: vi.fn().mockImplementation(() => ({
          edit_profile: mockEditProfile,
          delete_account: mockDeleteAccount,
     })),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const BASE = '/api/v1/users'
const AUTH_HEADER = 'Bearer valid.token.here'

const mockUser = {
     _id: '507f1f77bcf86cd799439011',
     fullname: 'Test User',
     username: 'testuser',
     email: 'test@example.com',
     avatar: '',
     apiKey: 'some-uuid-v4',
     plan: 'free',
     tokens: { used: 0, limit: 10, lastResetAt: new Date().toISOString() },
}

// ─── App setup ────────────────────────────────────────────────────────────────
let app: Express

beforeAll(() => {
     app = createTestApp()
})

beforeEach(() => {
     vi.clearAllMocks()
})

// ─── GET /users/profile ───────────────────────────────────────────────────────
describe(`GET ${BASE}/profile`, () => {

     it('returns 401 when Authorization header is missing', async () => {
          const res = await request(app).get(`${BASE}/profile`)
          expect(res.status).toBe(401)
     })

     it('returns 401 when token format is invalid', async () => {
          const res = await request(app)
               .get(`${BASE}/profile`)
               .set('Authorization', 'InvalidToken')
          expect(res.status).toBe(401)
     })

     it('returns 200 with user data when authenticated', async () => {
          const res = await request(app)
               .get(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)

          expect(res.status).toBe(200)
          expect(res.body).toMatchObject({
               message: 'Profile fetched successfully',
               data: expect.objectContaining({
                    _id: mockUser._id,
                    email: mockUser.email,
               }),
          })
     })
})

// ─── PUT /users/profile ───────────────────────────────────────────────────────
describe(`PUT ${BASE}/profile`, () => {

     // ── Auth guard ───────────────────────────────────────────────────────────

     it('returns 401 when Authorization header is missing', async () => {
          const res = await request(app).put(`${BASE}/profile`).send({ fullname: 'New Name' })
          expect(res.status).toBe(401)
     })

     // ── DTO validation ───────────────────────────────────────────────────────

     it('returns 400 when fullname is shorter than 2 characters', async () => {
          const res = await request(app)
               .put(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)
               .send({ fullname: 'A' })

          expect(res.status).toBe(400)
     })

     it('returns 400 when username is shorter than 2 characters', async () => {
          const res = await request(app)
               .put(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)
               .send({ username: 'x' })

          expect(res.status).toBe(400)
     })

     // ── Business logic ───────────────────────────────────────────────────────

     it('returns 404 when user is not found', async () => {
          mockEditProfile.mockResolvedValue(null)

          const res = await request(app)
               .put(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)
               .send({ fullname: 'New Name' })

          expect(res.status).toBe(404)
     })

     it('returns 200 with updated user on success', async () => {
          const updatedUser = { ...mockUser, fullname: 'New Name' }
          mockEditProfile.mockResolvedValue(updatedUser)

          const res = await request(app)
               .put(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)
               .send({ fullname: 'New Name' })

          expect(res.status).toBe(200)
          expect(res.body).toMatchObject({
               code: 200,
               success: true,
               message: 'Profile updated successfully',
               data: expect.objectContaining({ fullname: 'New Name' }),
          })
     })

     it('calls edit_profile with the correct userId and payload', async () => {
          mockEditProfile.mockResolvedValue({ ...mockUser, username: 'newuser' })

          await request(app)
               .put(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)
               .send({ username: 'newuser' })

          expect(mockEditProfile).toHaveBeenCalledOnce()
          expect(mockEditProfile).toHaveBeenCalledWith(
               mockUser._id,
               expect.objectContaining({ username: 'newuser' }),
          )
     })

     it('uploads avatar to cloudinary and includes secure_url in update', async () => {
          const cloudinaryUrl = 'https://res.cloudinary.com/test/image/upload/avatar.jpg'
          mockUploadToCloudinary.mockResolvedValue({ secure_url: cloudinaryUrl })
          mockEditProfile.mockResolvedValue({ ...mockUser, avatar: cloudinaryUrl })

          const res = await request(app)
               .put(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)
               .attach('avatar', Buffer.from('fake-image-data'), 'avatar.jpg')

          expect(res.status).toBe(200)
          expect(mockEditProfile).toHaveBeenCalledWith(
               mockUser._id,
               expect.objectContaining({ avatar: cloudinaryUrl }),
          )
     })

     it('accepts empty body without error (all fields optional)', async () => {
          mockEditProfile.mockResolvedValue(mockUser)

          const res = await request(app)
               .put(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)
               .send({})

          expect(res.status).toBe(200)
     })
})

// ─── DELETE /users/profile ────────────────────────────────────────────────────
describe(`DELETE ${BASE}/profile`, () => {

     // ── Auth guard ───────────────────────────────────────────────────────────

     it('returns 401 when Authorization header is missing', async () => {
          const res = await request(app).delete(`${BASE}/profile`)
          expect(res.status).toBe(401)
     })

     // ── Business logic ───────────────────────────────────────────────────────

     it('returns 404 when user is not found', async () => {
          mockDeleteAccount.mockResolvedValue(null)

          const res = await request(app)
               .delete(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)

          expect(res.status).toBe(404)
     })

     it('returns 200 with success message on deletion', async () => {
          mockDeleteAccount.mockResolvedValue(true)

          const res = await request(app)
               .delete(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)

          expect(res.status).toBe(200)
          expect(res.body).toMatchObject({
               code: 200,
               success: true,
               message: 'Account deleted successfully',
          })
     })

     it('clears access_token and refresh_token cookies on deletion', async () => {
          mockDeleteAccount.mockResolvedValue(true)

          const res = await request(app)
               .delete(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)

          const cookies: string[] = res.headers['set-cookie'] ?? []
          const clearedNames = cookies.map((c: string) => c.split('=')[0])
          expect(clearedNames).toContain('access_token')
          expect(clearedNames).toContain('refresh_token')
     })

     it('calls delete_account with the correct userId', async () => {
          mockDeleteAccount.mockResolvedValue(true)

          await request(app)
               .delete(`${BASE}/profile`)
               .set('Authorization', AUTH_HEADER)

          expect(mockDeleteAccount).toHaveBeenCalledOnce()
          expect(mockDeleteAccount).toHaveBeenCalledWith(mockUser._id)
     })
})
