import { Router } from 'express'
import { validateDTO } from '../../middleware/validateDTO'
import { AnalyzeDTO } from './DTO/index.dto'
import { analyzeController } from './agent.controller'

const router: Router = Router()

router.post('/analyze', validateDTO(AnalyzeDTO), analyzeController)

export default router
