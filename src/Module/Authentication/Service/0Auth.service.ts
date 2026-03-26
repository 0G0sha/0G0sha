import { BasedAuthService } from "./based-auth.service";
import axios from "axios";
import { randomBytes } from "node:crypto";
import { UserModel } from "../../../gen-import";

export class OauthService extends BasedAuthService {
     private readonly google_url: string = ""
     constructor() {
          super()
          this.google_url = "https://www.googleapis.com/oauth2/v3/userinfo"
     }

     private async getGoogleUser(payload: string) {
          const response = await axios.get(this.google_url, {
               headers: {
                    Authorization: `Bearer ${payload}`
               }
          })
          return response.data
     }

     public async user_data(payload: string) {
          const googleUser = await this.getGoogleUser(payload);
          const cUser = await UserModel.findOne(
               { email: googleUser.email.toLowerCase() },
               { _id: 1, tokenVersion: 1 },
          );
          return { data: cUser, googleUser }
     }

     public async createNewAccount(payload: { email: string; name: string; sub: string; picture: string; }) {
          const outputString = payload.name.replace(/\s/g, "-");
          const finalName = outputString + Math.floor(Math.random() * 10000001);
          const password = randomBytes(32).toString("hex");

          const newUser = await UserModel.create({
               fullname: payload.name,
               email: payload.email,
               password,
               username: finalName,
               googleId: payload.sub,
               avatar: payload.picture,
          });

          return { data: newUser }
     }
}
