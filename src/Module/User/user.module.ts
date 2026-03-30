import { Router } from 'express'
import { profileMiddleware, upload } from '../../gen-import'
import { EditProfileDTO } from './DTO/index.dto'
import { editProfileController, deleteAccountController, profileController } from './user.controller'
import { validateDTO } from '../../middleware/validateDTO'

const router: Router = Router()

router.get('/profile', profileMiddleware, profileController)
router.put('/profile/:id', profileMiddleware, upload.single('avatar'), validateDTO(EditProfileDTO), editProfileController)
router.delete('/profile/:id', profileMiddleware, deleteAccountController)

export default router
