import { db } from "@repo/db";
import type {
  SendOtpRequest,
  VerifySigninOtpRequest,
  VerifySignupOtpRequest
} from "@repo/zod";
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
    const result = await auth.api
      .signInEmailOTP({
        body: { email, otp, name }
      })
      .catch(() => {
        throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");
      });

    return { user: result.user };
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
    const result = await auth.api
      .signInEmailOTP({
        body: { email, otp }
      })
      .catch(() => {
        throw new AppError("Invalid or expired OTP", 400, "INVALID_OTP");
      });

    return { user: result.user };
  },

  async signout(nodeHeaders: ReturnType<typeof fromNodeHeaders>) {
    await auth.api.signOut({ headers: nodeHeaders });
    return { message: "Signed out" };
  },

  async me(nodeHeaders: ReturnType<typeof fromNodeHeaders>) {
    const session = await auth.api.getSession({ headers: nodeHeaders });
    if (!session) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    return session.user;
  }
};
