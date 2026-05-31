import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-display uppercase tracking-[0.06em] rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:translate-y-[1px] select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-iris text-[#241a52] font-bold hover:bg-iris/90 shadow-[0_2px_0_0_var(--color-iris-deep),0_10px_22px_-12px_var(--color-iris-deep)] hover:shadow-[0_2px_0_0_var(--color-iris-deep),0_14px_26px_-12px_var(--color-iris-deep)] active:shadow-[0_1px_0_0_var(--color-iris-deep)]",
        ember:
          "bg-ember text-white font-bold hover:bg-ember/90 shadow-[0_2px_0_0_var(--color-ember-deep),0_10px_22px_-12px_var(--color-ember-deep)] active:shadow-[0_1px_0_0_var(--color-ember-deep)]",
        ink:
          "bg-ticket-ink text-white hover:bg-ticket-ink/90 shadow-[0_2px_0_0_rgba(59,52,80,0.45),0_10px_22px_-12px_rgba(59,52,80,0.55)] active:shadow-[0_1px_0_0_rgba(59,52,80,0.45)]",
        ghost:
          "bg-transparent text-ink border border-edge hover:bg-surface hover:border-edge-strong",
        ghostInk:
          "bg-transparent text-ticket-ink border border-ticket-edge hover:bg-ticket-ink/5",
        danger:
          "bg-transparent text-rose border border-rose/35 hover:bg-rose/10",
        icon:
          "bg-surface border border-edge text-ink hover:bg-surface-strong hover:border-edge-strong",
        iconInk:
          "bg-transparent border border-ticket-edge text-ticket-ink hover:bg-ticket-ink/5"
      },
      size: {
        xs: "h-8 px-3 text-[11px]",
        sm: "h-10 px-4 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11 px-0",
        iconSm: "h-9 w-9 px-0"
      }
    },
    defaultVariants: { variant: "primary", size: "md" }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const variantInlineStyle: Partial<Record<NonNullable<ButtonProps["variant"]>, React.CSSProperties>> = {
  primary: { color: "#241a52", backgroundColor: "#9a8bf2" },
  ember: { color: "#5a2a18", backgroundColor: "#ff9f80" },
  ink: { color: "#ffffff", backgroundColor: "#3b3450" }
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, style, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const variantStyle = variantInlineStyle[variant ?? "primary"];
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        style={{ ...variantStyle, ...style }}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
export { buttonVariants };
