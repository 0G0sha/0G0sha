import { Namespace, Server } from "socket.io";
import { ioSocket } from "./app";

let notificationNamespace: ReturnType<Server['of']>;

export const socketFunction = () => {
     notificationNamespace = ioSocket.of('/notification');

     // notifiactionSocket(notificationNamespace)
};
export const getNotificationNamespace = (): Namespace => notificationNamespace;
