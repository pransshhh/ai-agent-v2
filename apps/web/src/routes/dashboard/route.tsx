import {
  createFileRoute,
  Outlet,
  redirect,
  useRouteContext
} from "@tanstack/react-router";
import { AppSidebar } from "@/components/app-sidebar";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const session = await authClient.getSession();
    if (!session.data) {
      throw redirect({ to: "/auth/signin" });
    }
    return { session: session.data };
  },
  component: () => {
    const { session } = useRouteContext({ from: "/dashboard" });
    return (
      <div className="flex h-svh overflow-hidden">
        <AppSidebar user={session.user} />
        <main className="flex flex-1 flex-col overflow-auto">
          <Outlet />
        </main>
      </div>
    );
  }
});
