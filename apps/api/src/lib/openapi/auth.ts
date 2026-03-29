import type { OpenAPIRegistry } from "@asteasolutions/zod-to-openapi";
import {
  ZAuthResponse,
  ZSendOtpRequest,
  ZVerifySigninOtpRequest,
  ZVerifySignupOtpRequest
} from "@repo/zod/auth";
import { ZErrorResponse, ZSuccessResponse } from "@repo/zod/common";

export function registerAuthPaths(registry: OpenAPIRegistry) {
  const cookieAuth = [{ cookieAuth: [] }];

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/signup",
    tags: ["Auth"],
    summary: "Send OTP for signup",
    request: {
      body: {
        content: {
          "application/json": { schema: ZSendOtpRequest.omit({ name: true }) }
        }
      }
    },
    responses: {
      200: {
        description: "OTP sent",
        content: { "application/json": { schema: ZSuccessResponse } }
      },
      409: {
        description: "Email already registered",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/signup/verify",
    tags: ["Auth"],
    summary: "Verify OTP and create account",
    request: {
      body: {
        content: { "application/json": { schema: ZVerifySignupOtpRequest } }
      }
    },
    responses: {
      201: {
        description: "Account created",
        content: { "application/json": { schema: ZAuthResponse } }
      },
      400: {
        description: "Invalid or expired OTP",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/signin",
    tags: ["Auth"],
    summary: "Send OTP for signin",
    request: {
      body: {
        content: {
          "application/json": { schema: ZSendOtpRequest.omit({ name: true }) }
        }
      }
    },
    responses: {
      200: {
        description: "OTP sent",
        content: { "application/json": { schema: ZSuccessResponse } }
      },
      404: {
        description: "No account found",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/signin/verify",
    tags: ["Auth"],
    summary: "Verify OTP and signin",
    request: {
      body: {
        content: { "application/json": { schema: ZVerifySigninOtpRequest } }
      }
    },
    responses: {
      200: {
        description: "Signed in",
        content: { "application/json": { schema: ZAuthResponse } }
      },
      400: {
        description: "Invalid or expired OTP",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });

  registry.registerPath({
    method: "post",
    path: "/api/v1/auth/signout",
    tags: ["Auth"],
    summary: "Sign out",
    security: cookieAuth,
    responses: {
      200: {
        description: "Signed out",
        content: { "application/json": { schema: ZSuccessResponse } }
      }
    }
  });

  registry.registerPath({
    method: "get",
    path: "/api/v1/auth/me",
    tags: ["Auth"],
    summary: "Get current user",
    security: cookieAuth,
    responses: {
      200: {
        description: "Current user",
        content: { "application/json": { schema: ZAuthResponse } }
      },
      401: {
        description: "Unauthorized",
        content: { "application/json": { schema: ZErrorResponse } }
      }
    }
  });
}
