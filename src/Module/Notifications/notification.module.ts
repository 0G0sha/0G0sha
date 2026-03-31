import { Router } from 'express'
import { profileMiddleware } from '../../gen-import'
import { validateDTO } from '../../middleware/validateDTO'
import { PublishNotificationDTO } from './DTO/index.dto'
import { streamController, publishController } from './notification.controller'

const router: Router = Router()

router.get('/stream', profileMiddleware, streamController)
router.post('/publish', profileMiddleware, validateDTO(PublishNotificationDTO), publishController)

export default router
