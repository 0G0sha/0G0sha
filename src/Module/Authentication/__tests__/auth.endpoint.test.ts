import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createTestApp } from '../../../__tests__/helpers/test-app'

// ─── Infrastructure mocks (prevent real Redis / BullMQ connections) ───────────
vi.mock('../../../config/redis', () => ({
  default: { on: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
  redisConfig: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../MessageQueue/Queue/queue.email', () => ({
  queue: { add: vi.fn(), on: vi.fn(), close: vi.fn() },
  addJobToQueue: vi.fn().mockResolvedValue(undefined),
}))

// ─── Rate limiter bypass (prevents test exhausting the auth window) ────────────
vi.mock('../../../utils/limit-request', () => ({
  authlimiter: (_req: any, _res: any, next: any) => next(),
  limiter: (_req: any, _res: any, next: any) => next(),
}))

// ─── Hoist mock functions so they are available inside vi.mock factory ────────
const { mockCheckAccount, mockCreateAccount } = vi.hoisted(() => ({
  mockCheckAccount: vi.fn(),
  mockCreateAccount: vi.fn(),
}))

vi.mock('../Service/based-auth.service', () => ({
  BasedAuthService: vi.fn().mockImplementation(() => ({
    check_account: mockCheckAccount,
    create_account: mockCreateAccount,
    create_token: vi.fn(),
  })),
}))

// ─── Shared fixtures ──────────────────────────────────────────────────────────
const BASE = '/api/v1/auth'

const validUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'Password123!',
}

// ─── App setup ────────────────────────────────────────────────────────────────
let app: Express

beforeAll(() => {
  app = createTestApp()
})

beforeEach(() => {
  vi.clearAllMocks()
})

// ─── POST /register ───────────────────────────────────────────────────────────
describe(`POST ${BASE}/register`, () => {

  // ── DTO validation (no service calls needed) ──────────────────────────────
  describe('DTO validation', () => {
    it('returns 400 when body is empty', async () => {
      const res = await request(app).post(`${BASE}/register`).send({})
      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
    })

    it('returns 400 when name is missing', async () => {
      const { name: _, ...body } = validUser
      const res = await request(app).post(`${BASE}/register`).send(body)
      expect(res.status).toBe(400)
    })

    it('returns 400 when email is missing', async () => {
      const { email: _, ...body } = validUser
      const res = await request(app).post(`${BASE}/register`).send(body)
      expect(res.status).toBe(400)
    })

    it('returns 400 when email is invalid', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send({ ...validUser, email: 'not-an-email' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when password is missing', async () => {
      const { password: _, ...body } = validUser
      const res = await request(app).post(`${BASE}/register`).send(body)
      expect(res.status).toBe(400)
    })

    it('returns 400 when password is too short', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send({ ...validUser, password: 'Ab1!' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when password has no uppercase letter', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send({ ...validUser, password: 'password123!' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when password has no number', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send({ ...validUser, password: 'Password!' })
      expect(res.status).toBe(400)
    })

    it('returns 400 when password has no special character', async () => {
      const res = await request(app)
        .post(`${BASE}/register`)
        .send({ ...validUser, password: 'Password123' })
      expect(res.status).toBe(400)
    })
  })

  // ── Business logic ────────────────────────────────────────────────────────
  describe('business logic', () => {
    it('returns 400 when email is already registered', async () => {
      mockCheckAccount.mockResolvedValueOnce({ _id: 'existing-id' })

      const res = await request(app).post(`${BASE}/register`).send(validUser)

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(mockCheckAccount).toHaveBeenCalledWith(validUser.email)
      expect(mockCreateAccount).not.toHaveBeenCalled()
    })

    it('returns 201 with access token and sets httpOnly cookies on success', async () => {
      mockCheckAccount.mockResolvedValueOnce(null)
      mockCreateAccount.mockResolvedValueOnce({
        success: true,
        access_token: 'mock_access_token',
        refresh_token: 'mock_refresh_token',
      })

      const res = await request(app).post(`${BASE}/register`).send(validUser)

      expect(res.status).toBe(201)
      expect(res.body).toMatchObject({
        code: 201,
        status: 'Created',
        success: true,
        error: false,
        message: 'User created successfully',
        token: 'mock_access_token',
      })

      const cookies: string[] = res.headers['set-cookie'] as unknown as string[]
      expect(cookies).toBeDefined()

      const accessCookie = cookies.find((c) => c.startsWith('access_token='))
      const refreshCookie = cookies.find((c) => c.startsWith('refresh_token='))

      expect(accessCookie).toBeDefined()
      expect(accessCookie).toMatch(/HttpOnly/i)
      expect(accessCookie).toMatch(/Secure/i)
      expect(accessCookie).toMatch(/SameSite=Strict/i)

      expect(refreshCookie).toBeDefined()
      expect(refreshCookie).toMatch(/HttpOnly/i)
      expect(refreshCookie).toMatch(/Secure/i)
      expect(refreshCookie).toMatch(/SameSite=Strict/i)
    })

    it('calls check_account with lowercased email', async () => {
      mockCheckAccount.mockResolvedValueOnce(null)
      mockCreateAccount.mockResolvedValueOnce({
        success: true,
        access_token: 'at',
        refresh_token: 'rt',
      })

      await request(app)
        .post(`${BASE}/register`)
        .send({ ...validUser, email: 'TEST@EXAMPLE.COM' })

      expect(mockCheckAccount).toHaveBeenCalledWith('TEST@EXAMPLE.COM')
    })
  })
})
