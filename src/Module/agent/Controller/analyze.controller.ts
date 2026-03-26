import type { Request, RequestHandler, Response } from 'express'
import { asyncHandler } from '../../../utils/api-requesthandler'
import { AgentService } from '../Service/based-agent.service'
import type { AnalyzeDTO } from '../DTO/index.dto'

export const analyzeController: RequestHandler = asyncHandler(
     async (req: Request, res: Response) => {
          const { text } = req.body as AnalyzeDTO
          const service = new AgentService()
          const result = service.analyze(text)
          res.status(200).json({ success: true, data: result })
     }
)
