import { db } from "@repo/db";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { logger } from "./logger";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "postgresql"
  }),
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      disableSignUp: false,
      async sendVerificationOTP({ email, otp, type }) {
        // TODO: replace with Resend when packages/email is ready
        logger.info({ email, type }, `OTP for ${email}: ${otp}`);
      }
    })
  ]
});
