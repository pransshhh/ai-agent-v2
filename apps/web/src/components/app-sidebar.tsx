import { Link } from "@tanstack/react-router";
import { BotIcon, FolderKanban, LayoutDashboard, ListTodo } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { UserMenu } from "@/components/user-menu";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: React.ElementType;
  exact?: boolean;
  disabled?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, exact: true },
  {
    label: "Projects",
    to: "/dashboard/projects",
    icon: FolderKanban,
    disabled: true
  },
  { label: "Jira Space", to: "/dashboard/jira", icon: ListTodo, disabled: true }
];

type User = { name: string; email: string };

export function AppSidebar({ user }: { user: User }) {
  return (
    <aside className="flex h-svh w-56 shrink-0 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 px-4 border-b">
        <BotIcon className="size-5" />
        <span className="font-semibold tracking-tight text-sm">
          AI Dev Agent
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 p-2 overflow-y-auto">
        {navItems.map((item) =>
          item.disabled ? (
            <span
              key={item.label}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground/50 cursor-not-allowed select-none"
            >
              <item.icon className="size-4" />
              {item.label}
            </span>
          ) : (
            <Link
              key={item.label}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              activeProps={{ "data-active": "true" } as object}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm",
                "text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
                "data-active:bg-accent data-active:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        )}
      </nav>

      {/* User */}
      <div className="p-2 border-t">
        <Separator className="mb-2" />
        <div className="flex items-center gap-2 px-2 py-1">
          <UserMenu user={user} />
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium truncate">{user.name}</span>
            <span className="text-xs text-muted-foreground truncate">
              {user.email}
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
