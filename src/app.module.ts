import { Application } from "express";
import auth_module from "./Module/Authentication/auth.module";
import user_module from "./Module/User/user.module";
import agent_module from "./Module/agent/agent.module";
import notification_module from "./Module/Notifications/notification.module";

export default (app: Application) => {
     app.use('/api/v1/auth', auth_module)
     app.use('/api/v1/users', user_module)
     app.use('/api/v1/agent', agent_module)
     app.use('/api/v1/notifications', notification_module)
}
