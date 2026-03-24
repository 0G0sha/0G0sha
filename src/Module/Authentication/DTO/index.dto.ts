import { z } from 'zod'

const passwordSchema = z
     .string({ required_error: 'Password is required' })
     .min(8, 'Password must be at least 8 characters')
     .max(64, 'Password must not exceed 64 characters')
     .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
     .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
     .regex(/[0-9]/, 'Password must contain at least one number')
     .regex(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'Password must contain at least one special character')

export const RegisterDTO = z.object({
     name: z
          .string({ required_error: 'Name is required' })
          .min(2, 'Name must be at least 2 characters')
          .max(50, 'Name must not exceed 50 characters'),
     email: z
          .string({ required_error: 'Email is required' })
          .email('Email must be a valid email address')
          .max(100, 'Email must not exceed 100 characters'),
     password: passwordSchema,
})
export type RegisterDTO = z.infer<typeof RegisterDTO>

export const LoginDTO = z.object({
     email: z
          .string({ required_error: 'Email is required' })
          .email('Email must be a valid email address')
          .max(100, 'Email must not exceed 100 characters'),
     password: passwordSchema,
})
export type LoginDTO = z.infer<typeof LoginDTO>
