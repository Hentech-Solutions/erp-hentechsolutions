import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Centered modal shell used for create/edit forms.
 * Header (title + subtitle + close), scrollable body, sticky footer.
 */
export function FormModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  footer,
  size = "3xl",
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  size?: "lg" | "2xl" | "3xl" | "4xl";
  children: React.ReactNode;
}) {
  const maxWidth = {
    lg: "max-w-lg",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
  }[size];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger>}
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)]",
            maxWidth,
            "bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-200",
          )}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-border/60 flex justify-between items-start bg-gradient-to-b from-white/[0.02] to-transparent">
            <div className="space-y-1">
              <DialogPrimitive.Title className="text-xl font-semibold tracking-tight">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-muted-foreground">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close className="p-2 -mt-1 -mr-2 hover:bg-muted/50 rounded-lg transition-colors text-muted-foreground hover:text-foreground cursor-pointer">
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="px-8 py-6 overflow-y-auto max-h-[70vh] form-modal-scroll">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-8 py-5 border-t border-border/60 bg-muted/10 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Subtle group label used inside form sections. */
export function FieldGroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </div>
  );
}