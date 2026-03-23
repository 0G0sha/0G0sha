import { Application } from "express";
import { auth_module } from "./the-import";

export default (app: Application) => {
     app.use('/api/v1/auth', auth_module)
}
