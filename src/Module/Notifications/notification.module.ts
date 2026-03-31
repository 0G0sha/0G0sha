import { Router } from 'express'
import { validateDTO } from '../../middleware/validateDTO'
import { PublishNotificationDTO, GetNotificationsDTO } from './DTO/index.dto'
import { streamController, publishController, getNotificationsController, markSeenController, markAllSeenController } from './notification.controller'
import { userMiddleware } from '../../middleware/user.middleware'

const router: Router = Router()

router.get('/stream', userMiddleware, streamController)
router.post('/publish', userMiddleware, validateDTO(PublishNotificationDTO), publishController)

// History & seen actions
router.get('/', userMiddleware, validateDTO(GetNotificationsDTO), getNotificationsController)
router.patch('/seen-all', userMiddleware, markAllSeenController)
router.patch('/:id/seen', userMiddleware, markSeenController)

export default router
