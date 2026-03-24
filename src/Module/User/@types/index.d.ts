import type { Document, Types } from 'mongoose'
import { USER_PLAN } from '../../../Shared/enum';

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
     googleId: string;
     plan: USER_PLAN;
     tokens: Tokens;
     subscription: Types.ObjectId;
}
