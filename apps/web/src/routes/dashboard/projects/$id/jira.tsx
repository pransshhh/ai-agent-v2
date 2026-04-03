import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/projects/$id/jira")({
  component: () => {
    const { id } = Route.useParams();
    return (
      <div className="flex flex-col h-full">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-6">
          <Link to="/dashboard/projects/$id" params={{ id }}>
            <Button variant="ghost" size="icon-sm">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-sm font-semibold">Jira Board</h1>
        </header>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Coming soon.</p>
        </div>
      </div>
    );
  }
});
