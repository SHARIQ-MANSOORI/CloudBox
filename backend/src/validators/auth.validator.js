import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z.string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters long')
});

export const verifyOtpSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  otp: z.string({ required_error: 'OTP is required' })
    .trim()
    .length(6, 'Verification code must be exactly 6 digits')
    .regex(/^\d+$/, 'Verification code must contain digits only')
});

export const loginSchema = z.object({
  email: z.string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z.string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
});
