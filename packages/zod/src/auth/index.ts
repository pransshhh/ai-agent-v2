import { z } from "zod";

export const ZUser = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  image: z.string().url().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const ZAuthResponse = z.object({
  user: ZUser
});

export const ZSendOtpRequest = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100).optional()
});

export const ZVerifySignupOtpRequest = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  name: z.string().min(2).max(100)
});

export const ZVerifySigninOtpRequest = z.object({
  email: z.string().email(),
  otp: z.string().length(6)
});

export type User = z.infer<typeof ZUser>;
export type AuthResponse = z.infer<typeof ZAuthResponse>;
export type SendOtpRequest = z.infer<typeof ZSendOtpRequest>;
export type VerifySignupOtpRequest = z.infer<typeof ZVerifySignupOtpRequest>;
export type VerifySigninOtpRequest = z.infer<typeof ZVerifySigninOtpRequest>;
