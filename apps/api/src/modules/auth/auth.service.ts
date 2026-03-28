import { db } from "@repo/db";
import type {
  SendOtpRequest,
  VerifySigninOtpRequest,
  VerifySignupOtpRequest
} from "@repo/zod/auth";
import type { fromNodeHeaders } from "better-auth/node";
import { auth } from "../../lib/auth";
import { AppError } from "../../middleware/error";

export const authService = {
  async sendSignupOtp({ email }: Pick<SendOtpRequest, "email">) {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing)
      throw new AppError("Email already registered", 409, "EMAIL_EXISTS");

    await auth.api.sendVerificationOTP({
      body: { email, type: "sign-in" }
    });

    return { message: "OTP sent" };
  },

  async verifySignupOtp({ email, otp, name }: VerifySignupOtpRequest) {
    const response = await auth.api
      .signInEmailOTP({
        body: { email, otp, name },
        asResponse: true
      })
      .catch(() => {
        throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");
      });

    return response;
  },

  async sendSigninOtp({ email }: Pick<SendOtpRequest, "email">) {
    const existing = await db.user.findUnique({ where: { email } });
    if (!existing)
      throw new AppError("No account found", 404, "USER_NOT_FOUND");

    await auth.api.sendVerificationOTP({
      body: { email, type: "sign-in" }
    });

    return { message: "OTP sent" };
  },

  async verifySigninOtp({ email, otp }: VerifySigninOtpRequest) {
    const existing = await db.user.findUnique({ where: { email } });
    if (!existing)
      throw new AppError("No account found", 404, "USER_NOT_FOUND");

    const response = await auth.api
      .signInEmailOTP({
        body: { email, otp },
        asResponse: true
      })
      .catch(() => {
        throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");
      });

    return response;
  },

  async signout(nodeHeaders: ReturnType<typeof fromNodeHeaders>) {
    await auth.api.signOut({ headers: nodeHeaders });
    return { message: "Signed out" };
  }
};
