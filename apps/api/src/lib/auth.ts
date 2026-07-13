import { db } from "@repo/db";
import { renderOtpEmail } from "@repo/emails";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "./logger";

const resend = new Resend(env.RESEND_API_KEY);

export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  trustedOrigins: [env.CORS_ORIGIN, env.BETTER_AUTH_URL],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  advanced: {
    useSecureCookies: env.NODE_ENV === "production"
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      disableSignUp: false,
      async sendVerificationOTP({ email, otp }) {
        try {
          const html = await renderOtpEmail(otp, 5);
          const { error } = await resend.emails.send({
            from: env.EMAIL_FROM,
            to: email,
            subject: "Your login code",
            html
          });
          if (error) {
            throw new Error(error.message ?? "Resend send failed");
          }
          logger.info({ email }, "OTP email sent");
        } catch (err) {
          logger.error(
            { email, err, otp },
            "Failed to send OTP email — fallback code logged"
          );
          throw err;
        }
      }
    })
  ]
});
