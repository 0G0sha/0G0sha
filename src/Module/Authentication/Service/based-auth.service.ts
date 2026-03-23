import { RegisterDTO, UserModel, token_PASETO } from "../../../the-import";

export class BasedAuthService {
     constructor() { }

     public async check_account(payload: string) {
          const user = await UserModel.findOne({ email: payload.toLowerCase() }, { _id: 1 })

          return user
     }

     public async create_account(payload: RegisterDTO) {
          const { name, email, password } = payload

          const user = await UserModel.create({
               fullname: name,
               email: email.toLowerCase(),

               password: password,
          })

          const access_token = await this.create_token({ _id: user._id.toString(), type: 'access' })
          const refresh_token = await this.create_token({ _id: user._id.toString(), type: 'refresh' })

          return { success: true, access_token, refresh_token }
     }


     public async create_token(payload: { _id: string; type: 'access' | 'refresh' | 'forget_password'; access_device?: string }): Promise<string> {
          const tokenPayload = {
               data: { user_id: payload._id },
               access_device: payload.access_device ?? 'unknown',
          }

          switch (payload.type) {
               case 'access':
                    return token_PASETO(tokenPayload, 'access')

               case 'refresh':
                    return token_PASETO(tokenPayload, 'refresh')

               case 'forget_password':
                    return token_PASETO(tokenPayload, 'forget_password')
          }
     }
}
