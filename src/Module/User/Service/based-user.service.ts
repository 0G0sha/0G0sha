import { createLogger } from '../../../utils/logger'
import type { EditProfileDTO } from '../DTO/index.dto'
import { UserModel } from '../Schema/user.schema'

const logger = createLogger('BasedUserService')

export class BasedUserService {
     public async edit_profile(userId: string, data: EditProfileDTO & { avatar?: string }) {
          const user = await UserModel.findByIdAndUpdate(
               userId,
               { $set: data },
               { new: true, select: '-password' }
          )

          if (!user) {
               return null
          }

          logger.info({ userId }, 'User profile updated')
          return user
     }

     public async delete_account(userId: string) {
          const result = await UserModel.findByIdAndDelete(userId)

          if (!result) {
               return null
          }

          logger.info({ userId }, 'User account deleted')
          return true
     }
}
