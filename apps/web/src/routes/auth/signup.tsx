import { createFileRoute } from "@tanstack/react-router";
import { SignupForm } from "./_components/signup-form";

export const Route = createFileRoute("/auth/signup")({
  component: () => (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignupForm />
      </div>
    </div>
  )
});
