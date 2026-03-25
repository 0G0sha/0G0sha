import { Application } from "express";
import auth_module from "./Module/Authentication/auth.module";
import user_module from "./Module/User/user.module";

export default (app: Application) => {
     app.use('/api/v1/auth', auth_module)
     app.use('/api/v1/users', user_module)
}
