import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
  component: () => {
    const { data: session, isPending } = authClient.useSession();

    return (
      <div className="flex min-h-svh flex-col">
        <header className="flex items-center justify-between px-6 py-4 border-b">
          <span className="font-semibold">AI Dev Agent</span>
          {!isPending &&
            (session?.user ? (
              <Link to="/dashboard">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {session.user.name?.charAt(0).toUpperCase()}
                </div>
              </Link>
            ) : (
              <Link to="/auth/signin">
                <Button size="sm">Sign in</Button>
              </Link>
            ))}
        </header>
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Landing page</p>
        </main>
      </div>
    );
  }
});
