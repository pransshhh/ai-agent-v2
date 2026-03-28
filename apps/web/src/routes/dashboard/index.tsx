import { createFileRoute, useRouteContext } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useSignout } from "@/hooks/use-auth";

export const Route = createFileRoute("/dashboard/")({
  component: () => {
    const { session } = useRouteContext({ from: "/dashboard" });
    const { mutate: signout } = useSignout();

    return (
      <div className="p-8">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome, {session.user.name}
        </p>
        <Button onClick={() => signout()}>Logout</Button>
      </div>
    );
  }
});
