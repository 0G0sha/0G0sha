import type { Document, Types } from 'mongoose'

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
     plan: 'free' | 'starter' | 'pro' | 'enterprise';
     tokens: Tokens;
     subscription: Types.ObjectId;
}
