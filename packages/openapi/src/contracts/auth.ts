import {
  ZAuthResponse,
  ZErrorResponse,
  ZSendOtpRequest,
  ZSuccessResponse,
  ZUser,
  ZVerifySigninOtpRequest,
  ZVerifySignupOtpRequest
} from "@repo/zod";
import { initContract } from "@ts-rest/core";
import { getSecurityMetadata } from "../utils";

const c = initContract();
const secured = getSecurityMetadata();

export const authContract = c.router(
  {
    sendSignupOtp: {
      summary: "Send OTP for signup",
      method: "POST",
      path: "/signup",
      body: ZSendOtpRequest.required({ name: true }),
      responses: {
        200: ZSuccessResponse,
        409: ZErrorResponse
      }
    },
    verifySignupOtp: {
      summary: "Verify OTP and create account",
      method: "POST",
      path: "/signup/verify",
      body: ZVerifySignupOtpRequest,
      responses: {
        201: ZAuthResponse,
        400: ZErrorResponse
      }
    },
    sendSigninOtp: {
      summary: "Send OTP for signin",
      method: "POST",
      path: "/signin",
      body: ZSendOtpRequest.omit({ name: true }),
      responses: {
        200: ZSuccessResponse,
        404: ZErrorResponse
      }
    },
    verifySigninOtp: {
      summary: "Verify OTP and signin",
      method: "POST",
      path: "/signin/verify",
      body: ZVerifySigninOtpRequest,
      responses: {
        200: ZAuthResponse,
        400: ZErrorResponse
      }
    },
    signout: {
      summary: "Sign out",
      method: "POST",
      path: "/signout",
      body: c.noBody(),
      responses: {
        200: ZSuccessResponse
      },
      metadata: secured
    },
    me: {
      summary: "Get current user",
      method: "GET",
      path: "/me",
      responses: {
        200: ZUser,
        401: ZErrorResponse
      },
      metadata: secured
    }
  },
  { pathPrefix: "/api/v1/auth" }
);
