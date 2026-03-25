import { z } from 'zod'

export const EditProfileDTO = z.object({
     fullname: z.string().min(2, 'Full name must be at least 2 characters').optional(),
     username: z.string().min(2, 'Username must be at least 2 characters').optional(),
})

export type EditProfileDTO = z.infer<typeof EditProfileDTO>
