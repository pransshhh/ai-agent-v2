import { Menu } from "@base-ui/react/menu";
import { Link } from "@tanstack/react-router";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useSignout } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

type User = {
  name: string;
  email: string;
};

export function UserMenu({ user }: { user: User }) {
  const { mutate: signout } = useSignout();
  const initial = user.name?.charAt(0).toUpperCase() ?? "?";

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "flex size-8 cursor-pointer items-center justify-center rounded-full",
          "bg-primary text-primary-foreground text-sm font-medium select-none",
          "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        )}
      >
        {initial}
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8}>
          <Menu.Popup
            className={cn(
              "z-50 min-w-48 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground",
              "shadow-md shadow-black/5 py-1",
              "data-starting-style:opacity-0 data-ending-style:opacity-0",
              "transition-opacity duration-150"
            )}
          >
            {/* User info — not interactive */}
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {user.email}
              </p>
            </div>

            <div className="py-1">
              <Menu.Item
                render={<Link to="/dashboard" />}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm",
                  "outline-none hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground"
                )}
              >
                <LayoutDashboard className="size-4 text-muted-foreground" />
                Dashboard
              </Menu.Item>

              <Menu.Item
                onClick={() => signout()}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm",
                  "outline-none hover:bg-accent hover:text-accent-foreground",
                  "focus:bg-accent focus:text-accent-foreground text-destructive"
                )}
              >
                <LogOut className="size-4" />
                Sign out
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
