import { createFileRoute, Link } from "@tanstack/react-router";
import { BotIcon, CodeIcon, GitBranch, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { UserMenu } from "@/components/user-menu";
import { authClient } from "@/lib/auth-client";

const features = [
  {
    icon: ListTodo,
    title: "AI-Powered Planning",
    description:
      "Describe what you want to build. The planning agent creates Jira epics, stories, and sprints automatically."
  },
  {
    icon: CodeIcon,
    title: "Autonomous Coding",
    description:
      "The coding agent picks up each ticket, writes the code, and marks it done — one by one, without manual effort."
  },
  {
    icon: BotIcon,
    title: "Live Agent Logs",
    description:
      "Watch the agent work in real time. Every step is streamed to the dashboard so you're never left guessing."
  },
  {
    icon: GitBranch,
    title: "Jira Integration",
    description:
      "Epics, stories, and sprints land directly in your Jira board. Approve the plan, then let the agent ship."
  }
];

export const Route = createFileRoute("/")({
  component: () => {
    const { data: session, isPending } = authClient.useSession();

    return (
      <div className="flex min-h-svh flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/95 px-6 backdrop-blur supports-backdrop-filter:bg-background/60">
          <Link to="/" className="flex items-center gap-2">
            <BotIcon className="size-5" />
            <span className="font-semibold tracking-tight">AI Dev Agent</span>
          </Link>

          <nav className="flex items-center gap-2">
            {!isPending &&
              (session?.user ? (
                <UserMenu user={session.user} />
              ) : (
                <>
                  <Link to="/auth/signin">
                    <Button variant="ghost" size="sm">
                      Sign in
                    </Button>
                  </Link>
                  <Link to="/auth/signup">
                    <Button size="sm">Get started</Button>
                  </Link>
                </>
              ))}
          </nav>
        </header>

        <main className="flex flex-1 flex-col">
          {/* Hero */}
          <section className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-24 text-center">
            <div className="flex flex-col items-center gap-4 max-w-2xl">
              <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">
                Agentic AI platform for developers
              </span>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Describe it.
                <br />
                <span className="text-muted-foreground">
                  We&apos;ll build it.
                </span>
              </h1>
              <p className="text-base text-muted-foreground max-w-md">
                AI Dev Agent turns your product idea into working code —
                planning Jira tickets and implementing them automatically, one
                by one.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {session?.user ? (
                <Link to="/dashboard">
                  <Button size="lg">Go to Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link to="/auth/signup">
                    <Button size="lg">Get started free</Button>
                  </Link>
                  <Link to="/auth/signin">
                    <Button variant="outline" size="lg">
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </section>

          {/* Features */}
          <section className="border-t bg-muted/40 px-6 py-20">
            <div className="mx-auto max-w-5xl">
              <h2 className="text-center text-2xl font-semibold tracking-tight mb-12">
                Everything you need to ship faster
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {features.map((feature) => (
                  <Card key={feature.title} size="sm">
                    <CardHeader>
                      <feature.icon className="size-5 text-muted-foreground mb-1" />
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t px-6 py-5 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} AI Dev Agent. All rights reserved.
        </footer>
      </div>
    );
  }
});
