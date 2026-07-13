import { render } from "@react-email/render";
import { OtpEmail } from "./otp-email";

export { OtpEmail } from "./otp-email";

/**
 * Renders the OTP email to an HTML string at runtime.
 * Consumed by apps/api — pass the result to any provider's `html` field.
 */
export async function renderOtpEmail(
  otp: string,
  expiryMinutes = 5
): Promise<string> {
  return await render(OtpEmail({ otp, expiryMinutes }));
}
