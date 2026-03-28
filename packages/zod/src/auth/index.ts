import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { z } from "zod";

extendZodWithOpenApi(z);

export const ZUser = z.object({
  id: z.string().openapi({ example: "clx1234" }),
  name: z.string().openapi({ example: "John Doe" }),
  email: z.email().openapi({ example: "john@example.com" }),
  image: z.url().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime()
});

export const ZAuthResponse = z.object({
  user: ZUser
});

export const ZSendOtpRequest = z.object({
  email: z
    .email("Please enter a valid email address")
    .openapi({ example: "john@example.com" }),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be at most 100 characters long")
    .optional()
});

export const ZVerifySignupOtpRequest = z.object({
  email: z
    .email("Please enter a valid email address")
    .openapi({ example: "john@example.com" }),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits long")
    .openapi({ example: "123456" }),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be at most 100 characters long")
    .openapi({ example: "John Doe" })
});

export const ZVerifySigninOtpRequest = z.object({
  email: z
    .email("Please enter a valid email address")
    .openapi({ example: "john@example.com" }),
  otp: z
    .string()
    .length(6, "OTP must be 6 digits long")
    .openapi({ example: "123456" })
});

export type User = z.infer<typeof ZUser>;
export type AuthResponse = z.infer<typeof ZAuthResponse>;
export type SendOtpRequest = z.infer<typeof ZSendOtpRequest>;
export type VerifySignupOtpRequest = z.infer<typeof ZVerifySignupOtpRequest>;
export type VerifySigninOtpRequest = z.infer<typeof ZVerifySigninOtpRequest>;
export type VerifyOtpResponse = {
  token?: string;
  user: User;
};
