import { model, Schema } from 'mongoose'
import type { IUser } from '../@types'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'

const userSchema = new Schema<IUser>({
  fullname: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    default: '',
    trim: true,
  },
  email: {
    type: String,
    required: true,
    toLowerCase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  avatar: {
    type: String,
    default: '',
  },
  apiKey: {
    type: String,
    default: () => uuidv4(),
  },
  plan: {
    type: String,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'free',
  },
  tokens: {
    type: Object,
    default: {
      used: 0,
      limit: 10,
      lastResetAt: new Date(),
    },
  },
  subscription: {
    type: Schema.Types.ObjectId,
    ref: 'Subscription',
  },
}, {
  timestamps: true,
})

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ apiKey: 1 }, { unique: true })

userSchema.pre('save', async function () {
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

export const UserModel = model<IUser>('User', userSchema)
