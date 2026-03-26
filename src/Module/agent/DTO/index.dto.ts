import { z } from 'zod'

export const AnalyzeDTO = z.object({
     text: z.string().min(1, 'text is required').max(5000, 'text must not exceed 5000 characters'),
     targetModel: z.enum(['claude', 'gpt', 'general']).optional(),
})

export type AnalyzeDTO = z.infer<typeof AnalyzeDTO>
