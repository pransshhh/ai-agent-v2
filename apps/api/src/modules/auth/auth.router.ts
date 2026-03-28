import {
  type VerifyOtpResponse,
  ZSendOtpRequest,
  ZVerifySigninOtpRequest,
  ZVerifySignupOtpRequest
} from "@repo/zod/auth";
import { fromNodeHeaders } from "better-auth/node";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { authService } from "./auth.service";

export const authRouter: Router = Router();

authRouter.post(
  "/signup",
  validate({ body: ZSendOtpRequest.omit({ name: true }) }),
  async (req, res) => {
    const data = await authService.sendSignupOtp(req.body);
    res.json(data);
  }
);

authRouter.post(
  "/signup/verify",
  validate({ body: ZVerifySignupOtpRequest }),
  async (req, res) => {
    const response = await authService.verifySignupOtp(req.body);
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });
    const body = (await response.json()) as VerifyOtpResponse;
    const { token: _, ...safeBody } = body;
    res.status(response.status).json(safeBody);
  }
);

authRouter.post(
  "/signin",
  validate({ body: ZSendOtpRequest.omit({ name: true }) }),
  async (req, res) => {
    const data = await authService.sendSigninOtp(req.body);
    res.json(data);
  }
);

authRouter.post(
  "/signin/verify",
  validate({ body: ZVerifySigninOtpRequest }),
  async (req, res) => {
    const response = await authService.verifySigninOtp(req.body);
    response.headers.forEach((value: string, key: string) => {
      res.setHeader(key, value);
    });
    const body = (await response.json()) as VerifyOtpResponse;
    const { token: _, ...safeBody } = body;
    res.status(response.status).json(safeBody);
  }
);

authRouter.post("/signout", requireAuth, async (req, res) => {
  const data = await authService.signout(fromNodeHeaders(req.headers));
  res.json(data);
});

authRouter.get("/me", requireAuth, async (_, res) => {
  res.json(res.locals.user);
});
