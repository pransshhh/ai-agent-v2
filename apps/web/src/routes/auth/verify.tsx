import { createFileRoute } from "@tanstack/react-router";
import { OtpForm } from "./_components/otp-form";

export const Route = createFileRoute("/auth/verify")({
  validateSearch: (search) => ({
    email: (search.email as string) ?? "",
    mode: (search.mode as "signup" | "signin") ?? "signin",
    name: (search.name as string) ?? ""
  }),
  component: () => {
    const { email, mode, name } = Route.useSearch();
    return (
      <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <OtpForm email={email} mode={mode} name={name} />
        </div>
      </div>
    );
  }
});
