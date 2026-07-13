import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text
} from "@react-email/components";
// biome-ignore lint/correctness/noUnusedImports: required at runtime — tsx/esbuild uses the classic JSX transform (React.createElement) here, not react-jsx
import * as React from "react";

interface OtpEmailProps {
  otp: string;
  /** Minutes until the code expires — matches the emailOTP `expiresIn` (300s = 5m). */
  expiryMinutes?: number;
}

export const OtpEmail = ({ otp, expiryMinutes = 5 }: OtpEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your AI Dev Agent login code</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="bg-white p-8 rounded-lg shadow-sm my-10 mx-auto max-w-150">
            <Heading className="text-2xl font-bold text-gray-800 mt-2">
              Your login code
            </Heading>

            <Section>
              <Text className="text-gray-700 text-base">
                Use the code below to finish signing in. It expires in{" "}
                {expiryMinutes} minutes.
              </Text>
            </Section>

            <Section className="my-6 text-center">
              <Text className="text-4xl font-bold tracking-[0.4em] text-gray-900 bg-gray-50 rounded-md py-4">
                {otp}
              </Text>
            </Section>

            <Section>
              <Text className="text-gray-600 text-sm">
                If you didn&apos;t request this code, you can safely ignore this
                email.
              </Text>
            </Section>

            <Hr className="border-gray-200 my-6" />

            <Section className="text-center">
              <Text className="text-gray-500 text-xs">
                © {new Date().getFullYear()} AI Dev Agent. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

// Powers the `email dev` preview server (pnpm --filter @repo/emails dev)
OtpEmail.PreviewProps = {
  otp: "123456",
  expiryMinutes: 5
} satisfies OtpEmailProps;

export default OtpEmail;
