import path from "node:path";
import dotenv from "dotenv";

const envFile = process.env.NODE_ENV === "development" ? ".env.dev" : ".env";
export default dotenv.config({
     path: path.resolve(process.cwd(), envFile)
});
