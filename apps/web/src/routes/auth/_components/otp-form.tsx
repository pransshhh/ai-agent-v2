import { useForm } from "@tanstack/react-form";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot
} from "@/components/ui/input-otp";
import { useVerifySigninOtp, useVerifySignupOtp } from "@/hooks/use-auth";

const otpSchema = z.object({ otp: z.string().length(6) });

type OtpFormProps = {
  email: string;
  mode: "signup" | "signin";
  name: string;
};

export function OtpForm({ email, mode, name }: OtpFormProps) {
  const { mutate: verifySignupOtp, error: signupError } = useVerifySignupOtp();
  const { mutate: verifySigninOtp, error: signinError } = useVerifySigninOtp();

  const error = mode === "signup" ? signupError : signinError;

  const form = useForm({
    defaultValues: { otp: "" },
    validators: { onSubmit: otpSchema },
    onSubmit: async ({ value }) => {
      if (mode === "signup") {
        verifySignupOtp({ email, otp: value.otp, name });
      } else {
        verifySigninOtp({ email, otp: value.otp });
      }
    }
  });

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Enter OTP</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <strong>{email}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="items-center">
            <form.Field name="otp">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel className="text-center w-full block">
                      One-time password
                    </FieldLabel>
                    <div className="flex justify-center w-full">
                      <InputOTP
                        maxLength={6}
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        pattern={REGEXP_ONLY_DIGITS}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup>
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                );
              }}
            </form.Field>

            {error && (
              <p className="text-sm text-destructive text-center">
                {error.message}
              </p>
            )}

            <form.Subscribe
              selector={(s) => [s.isSubmitting, s.values.otp] as const}
            >
              {([isSubmitting, otp]) => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || otp.length < 6}
                >
                  {isSubmitting ? "Verifying..." : "Verify OTP"}
                </Button>
              )}
            </form.Subscribe>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
