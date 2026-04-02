import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function DialogRoot(props: Dialog.Root.Props) {
  return <Dialog.Root {...props} />;
}

function DialogTrigger(props: Dialog.Trigger.Props) {
  return <Dialog.Trigger {...props} />;
}

function DialogClose({
  className,
  children,
  ...props
}: Dialog.Close.Props) {
  return (
    <Dialog.Close
      className={cn(
        "absolute top-4 right-4 rounded-lg p-1 text-muted-foreground",
        "hover:bg-accent hover:text-foreground outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      {...props}
    >
      {children ?? <X className="size-4" />}
    </Dialog.Close>
  );
}

function DialogContent({
  className,
  children,
  ...props
}: Dialog.Popup.Props) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-black/40",
          "data-starting-style:opacity-0 data-ending-style:opacity-0",
          "transition-opacity duration-200"
        )}
      />
      <Dialog.Popup
        className={cn(
          "fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-xl border border-border bg-popover p-6 shadow-lg text-popover-foreground",
          "data-starting-style:opacity-0 data-starting-style:scale-95",
          "data-ending-style:opacity-0 data-ending-style:scale-95",
          "transition-all duration-200",
          className
        )}
        {...props}
      >
        {children}
        <DialogClose />
      </Dialog.Popup>
    </Dialog.Portal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 mb-5", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: Dialog.Title.Props) {
  return (
    <Dialog.Title
      className={cn("text-base font-semibold leading-snug", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: Dialog.Description.Props) {
  return (
    <Dialog.Description
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center justify-end gap-2 mt-6", className)}
      {...props}
    />
  );
}

export {
  DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter
};
