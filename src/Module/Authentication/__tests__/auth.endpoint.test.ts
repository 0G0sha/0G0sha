import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'
import { createTestApp } from '../../../__tests__/helpers/test-app'

// ─────────────────────────────────────────────────────────────
// Shared test data
// ─────────────────────────────────────────────────────────────
const BASE = '/api/v1/auth'

const validUser = {
  fullname: 'Test User',
  username: 'testuser',
  email: 'test@example.com',
  password: 'Password123!',
}

// ─────────────────────────────────────────────────────────────
// App setup — no DB, no server
// ─────────────────────────────────────────────────────────────
let app: Express

beforeAll(() => {
  app = createTestApp()
})

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
describe(`POST ${BASE}/register`, () => {
  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 when email is missing', async () => {
    const { email: _email, ...body } = validUser
    const res = await request(app)
      .post(`${BASE}/register`)
      .send(body)

    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const { password: _pw, ...body } = validUser
    const res = await request(app)
      .post(`${BASE}/register`)
      .send(body)

    expect(res.status).toBe(400)
  })

  it('returns 201 with user data on valid registration', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send(validUser)

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('data')
    expect(res.body.data).toHaveProperty('email', validUser.email)
    expect(res.body.data).not.toHaveProperty('password')
  })

  it('returns 409 when email already exists', async () => {
    const res = await request(app)
      .post(`${BASE}/register`)
      .send(validUser)

    expect(res.status).toBe(409)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
describe(`POST ${BASE}/login`, () => {
  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email })

    expect(res.status).toBe(400)
  })

  it('returns 401 when credentials are wrong', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: 'wrongpassword' })

    expect(res.status).toBe(401)
  })

  it('returns 200 with tokens on valid credentials', async () => {
    const res = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('data')
    expect(res.body.data).toHaveProperty('accessToken')
    expect(res.body.data).toHaveProperty('refreshToken')
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
describe(`POST ${BASE}/logout`, () => {
  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app)
      .post(`${BASE}/logout`)

    expect(res.status).toBe(401)
  })

  it('returns 401 when token is invalid', async () => {
    const res = await request(app)
      .post(`${BASE}/logout`)
      .set('Authorization', 'Bearer invalid.token.here')

    expect(res.status).toBe(401)
  })

  it('returns 200 on successful logout with valid token', async () => {
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })

    const { accessToken } = loginRes.body.data as { accessToken: string }

    const res = await request(app)
      .post(`${BASE}/logout`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────
describe(`POST ${BASE}/refresh`, () => {
  it('returns 401 when refreshToken cookie is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/refresh`)

    expect(res.status).toBe(401)
  })

  it('returns 401 when refreshToken is invalid', async () => {
    const res = await request(app)
      .post(`${BASE}/refresh`)
      .set('Cookie', 'refreshToken=invalid.token.here')

    expect(res.status).toBe(401)
  })

  it('returns 200 with new accessToken on valid refreshToken', async () => {
    const loginRes = await request(app)
      .post(`${BASE}/login`)
      .send({ email: validUser.email, password: validUser.password })

    const cookies = loginRes.headers['set-cookie'] as unknown as string[]

    const res = await request(app)
      .post(`${BASE}/refresh`)
      .set('Cookie', cookies)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveProperty('accessToken')
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/auth/forget-password
// ─────────────────────────────────────────────────────────────
describe(`POST ${BASE}/forget-password`, () => {
  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/forget-password`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 200 even when email does not exist (security: no enumeration)', async () => {
    const res = await request(app)
      .post(`${BASE}/forget-password`)
      .send({ email: 'nonexistent@example.com' })

    expect(res.status).toBe(200)
  })

  it('returns 200 and queues reset email for valid account', async () => {
    const res = await request(app)
      .post(`${BASE}/forget-password`)
      .send({ email: validUser.email })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('message')
  })
})

// ─────────────────────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────────────────────
describe(`POST ${BASE}/reset-password`, () => {
  it('returns 400 when body is empty', async () => {
    const res = await request(app)
      .post(`${BASE}/reset-password`)
      .send({})

    expect(res.status).toBe(400)
  })

  it('returns 401 when reset token is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/reset-password`)
      .send({ password: 'NewPassword123!', confirmPassword: 'NewPassword123!' })

    expect(res.status).toBe(401)
  })

  it('returns 401 when reset token is invalid or expired', async () => {
    const res = await request(app)
      .post(`${BASE}/reset-password`)
      .set('Authorization', 'Bearer invalid.reset.token')
      .send({ password: 'NewPassword123!', confirmPassword: 'NewPassword123!' })

    expect(res.status).toBe(401)
  })

  it('returns 400 when passwords do not match', async () => {
    const res = await request(app)
      .post(`${BASE}/reset-password`)
      .set('Authorization', 'Bearer some.reset.token')
      .send({ password: 'NewPassword123!', confirmPassword: 'DifferentPassword!' })

    expect(res.status).toBe(400)
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/auth/google
// ─────────────────────────────────────────────────────────────
describe(`GET ${BASE}/google`, () => {
  it('redirects to Google OAuth consent screen', async () => {
    const res = await request(app)
      .get(`${BASE}/google`)

    expect(res.status).toBe(302)
    expect(res.headers['location']).toMatch(/accounts\.google\.com/)
  })
})

// ─────────────────────────────────────────────────────────────
// GET /api/auth/google/callback
// ─────────────────────────────────────────────────────────────
describe(`GET ${BASE}/google/callback`, () => {
  it('returns 400 when code query param is missing', async () => {
    const res = await request(app)
      .get(`${BASE}/google/callback`)

    expect(res.status).toBe(400)
  })

  it('returns 401 when Google code is invalid', async () => {
    const res = await request(app)
      .get(`${BASE}/google/callback?code=invalid_code`)

    expect(res.status).toBe(401)
  })
})
