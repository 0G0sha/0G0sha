import { Router } from 'express'
import { profileMiddleware, upload, validateDTO } from '../../gen-import'
import { EditProfileDTO } from './DTO/index.dto'
import { editProfileController, deleteAccountController, profileController } from './user.controller'

const router: Router = Router()

router.get('/profile', profileMiddleware, profileController)
router.put('/profile', profileMiddleware, upload.single('avatar'), validateDTO(EditProfileDTO), editProfileController)
router.delete('/profile', profileMiddleware, deleteAccountController)

export default router
