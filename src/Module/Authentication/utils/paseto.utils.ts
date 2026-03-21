import { createPrivateKey } from "node:crypto"
import { V4 } from "paseto"

type TokenType = "access" | "refresh" | "forget_password"

export const token_PASETO = async (payload: any, type: TokenType, expiresIn?: string): Promise<string> => {
     switch (type) {
          case "access":
               const privateKey = createPrivateKey(process.env.PRIVATE_ACCESS_TOKEN_SECRET as string)
               const token = await V4.sign(
                    {
                         data: { user_id: payload.data.user_id },
                         site: "KeepITs",
                         token_version: 2,
                         access_device: payload.access_device
                    },
                    privateKey,
                    { expiresIn: "2h" }
               )
               return token
          case "refresh":
               const privateKeyRefresh = createPrivateKey(process.env.PRIVATE_REFRESH_TOKEN_SECRET as string)
               const tokenRefresh = await V4.sign(
                    {
                         data: { user_id: payload.data.user_id },
                         site: "KeepITs",
                         token_version: 2,
                         access_device: payload.access_device
                    },
                    privateKeyRefresh,
                    { expiresIn: expiresIn || "30d" }
               )
               return tokenRefresh
          case "forget_password":
               const privateKeyForgetPassword = createPrivateKey(process.env.PRIVATE_FORGET_PASSWORD_SECRET_KY as string)
               const tokenForgetPassword = await V4.sign(
                    {
                         data: { user_id: payload.data.user_id },
                         site: "KeepITs",
                         token_version: 2,
                         access_device: payload.access_device
                    },
                    privateKeyForgetPassword,
                    { expiresIn: "2h" }
               )
               return tokenForgetPassword
     }

}
