import { createFileRoute } from "@tanstack/react-router";
import { SigninForm } from "./_components/signin-form";

export const Route = createFileRoute("/auth/signin")({
  component: () => (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SigninForm />
      </div>
    </div>
  )
});
