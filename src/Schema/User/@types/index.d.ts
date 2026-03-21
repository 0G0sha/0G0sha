import { Document, Types } from "mongoose";

interface Tokens {
     used: number;
     limit: number;
     lastResetAt: Date;
}

export interface IUser extends Document {
     fullname: string;
     username: string; // What should call you?
     email: string;
     password: string
     avatar: string;
     apiKey: string;
     plan: "free" | "starter" | "pro" | "enterprise";
     tokens: Tokens;
     subscription: Types.ObjectId;
}

export interface IUserRequest extends Request {
     _id?: Types.ObjectId | string;
     fullname?: string;
     username?: string;
     email?: string;
     avatar?: string;
     apiKey?: string;
     plan?: "free" | "starter" | "pro" | "enterprise";
     tokens?: Tokens;
     subscription?: Types.ObjectId;
}
