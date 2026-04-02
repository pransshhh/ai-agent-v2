import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        outline: "border border-border text-foreground",
        destructive: "bg-destructive/10 text-destructive",
        success: "bg-green-500/10 text-green-700 dark:text-green-400",
        warning: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
        info: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
        purple: "bg-purple-500/10 text-purple-700 dark:text-purple-400"
      }
    },
    defaultVariants: { variant: "default" }
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant, className }))} {...props} />
  );
}

export { Badge, badgeVariants };
