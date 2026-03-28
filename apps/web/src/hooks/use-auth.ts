import type {
  SendOtpRequest,
  VerifySigninOtpRequest,
  VerifySignupOtpRequest
} from "@repo/zod/auth";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

export const useSendSignupOtp = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: Pick<SendOtpRequest, "email"> & { name: string }) =>
      api.post("/api/v1/auth/signup", { email: data.email }),
    onSuccess: (_, variables) => {
      navigate({
        to: "/auth/verify",
        search: { email: variables.email, mode: "signup", name: variables.name }
      });
    }
  });
};

export const useSendSigninOtp = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: Pick<SendOtpRequest, "email">) =>
      api.post("/api/v1/auth/signin", data),
    onSuccess: (_, variables) => {
      navigate({
        to: "/auth/verify",
        search: { email: variables.email, mode: "signin", name: "" }
      });
    }
  });
};

export const useVerifySignupOtp = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: VerifySignupOtpRequest) =>
      api.post("/api/v1/auth/signup/verify", data),
    onSuccess: () => {
      navigate({ to: "/dashboard" });
    }
  });
};

export const useVerifySigninOtp = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (data: VerifySigninOtpRequest) =>
      api.post("/api/v1/auth/signin/verify", data),
    onSuccess: () => {
      navigate({ to: "/dashboard" });
    }
  });
};

export const useSignout = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: () => authClient.signOut(),
    onSuccess: () => {
      navigate({ to: "/auth/signin" });
    }
  });
};
