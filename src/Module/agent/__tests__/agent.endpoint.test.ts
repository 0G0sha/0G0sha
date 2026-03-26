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

// ─── Service mock ─────────────────────────────────────────────────────────────
const { mockAnalyze } = vi.hoisted(() => ({
     mockAnalyze: vi.fn(),
}))

vi.mock('../Service/based-agent.service', () => ({
     AgentService: vi.fn().mockImplementation(() => ({
          analyze: mockAnalyze,
     })),
}))

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const BASE = '/api/v1/agent'

const analysisResult = {
     tokens: [{ word: 'create', isKeyword: true, weight: 3 }],
     keywords: ['create', 'api'],
     category: 'coding',
     complexity: 'simple',
     intent: 'User wants to: create, api',
     gaps: [],
     rawScore: 0,
}

// ─── App setup ────────────────────────────────────────────────────────────────
let app: Express

beforeAll(() => {
     app = createTestApp()
})

beforeEach(() => {
     vi.clearAllMocks()
})

// ─── POST /agent/analyze ──────────────────────────────────────────────────────
describe(`POST ${BASE}/analyze`, () => {

     // ── DTO validation ──────────────────────────────────────────────────────

     it('returns 400 when body is empty', async () => {
          const res = await request(app).post(`${BASE}/analyze`).send({})
          expect(res.status).toBe(400)
     })

     it('returns 400 when text is missing', async () => {
          const res = await request(app).post(`${BASE}/analyze`).send({ targetModel: 'claude' })
          expect(res.status).toBe(400)
     })

     it('returns 400 when text is an empty string', async () => {
          const res = await request(app).post(`${BASE}/analyze`).send({ text: '' })
          expect(res.status).toBe(400)
     })

     it('returns 400 when text exceeds 5000 characters', async () => {
          const res = await request(app)
               .post(`${BASE}/analyze`)
               .send({ text: 'a'.repeat(5001) })
          expect(res.status).toBe(400)
     })

     it('returns 400 when targetModel is an invalid value', async () => {
          const res = await request(app)
               .post(`${BASE}/analyze`)
               .send({ text: 'create an api', targetModel: 'unknown' })
          expect(res.status).toBe(400)
     })

     // ── Success ─────────────────────────────────────────────────────────────

     it('returns 200 with analysis result for valid text', async () => {
          mockAnalyze.mockReturnValue(analysisResult)

          const res = await request(app)
               .post(`${BASE}/analyze`)
               .send({ text: 'create an api' })

          expect(res.status).toBe(200)
          expect(res.body.success).toBe(true)
          expect(res.body.data).toEqual(analysisResult)
          expect(mockAnalyze).toHaveBeenCalledWith('create an api')
     })

     it('accepts optional targetModel without error', async () => {
          mockAnalyze.mockReturnValue(analysisResult)

          const res = await request(app)
               .post(`${BASE}/analyze`)
               .send({ text: 'build a react component', targetModel: 'claude' })

          expect(res.status).toBe(200)
          expect(mockAnalyze).toHaveBeenCalledWith('build a react component')
     })

     it('calls service.analyze with the exact text from the request', async () => {
          mockAnalyze.mockReturnValue(analysisResult)
          const text = 'write a blog post about typescript'

          await request(app).post(`${BASE}/analyze`).send({ text })

          expect(mockAnalyze).toHaveBeenCalledOnce()
          expect(mockAnalyze).toHaveBeenCalledWith(text)
     })
})
