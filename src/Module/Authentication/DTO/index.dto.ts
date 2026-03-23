import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength, } from 'class-validator'

export class RegisterDTO {
     @IsNotEmpty({ message: 'Name is required' })
     @IsString({ message: 'Name must be a string' })
     @MinLength(2, { message: 'Name must be at least 2 characters' })
     @MaxLength(50, { message: 'Name must not exceed 50 characters' })
     name: string

     @IsNotEmpty({ message: 'Email is required' })
     @IsEmail({}, { message: 'Email must be a valid email address' })
     @MaxLength(100, { message: 'Email must not exceed 100 characters' })
     email: string

     @IsNotEmpty({ message: 'Password is required' })
     @IsString({ message: 'Password must be a string' })
     @MinLength(8, { message: 'Password must be at least 8 characters' })
     @MaxLength(64, { message: 'Password must not exceed 64 characters' })
     @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
     @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
     @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
     @Matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, {
          message: 'Password must contain at least one special character',
     })
     password: string
}
