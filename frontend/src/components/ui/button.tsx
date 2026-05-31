import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "pressable inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md border font-bold tracking-normal transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-iris-deep focus-visible:ring-offset-2 focus-visible:ring-offset-canvas select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-iris text-primary-foreground border-iris-deep/45 hover:bg-iris-dark",
        ember:
          "bg-ember text-accent-foreground border-ember-deep/45 hover:bg-ember/90",
        sage:
          "bg-lime text-secondary-foreground border-lime-deep/45 hover:bg-lime/90",
        ink:
          "bg-ticket-ink text-white border-ticket-ink hover:bg-ticket-ink/90",
        ghost:
          "bg-lime/40 text-ink border-lime-deep/35 hover:bg-lime/55 hover:border-lime-deep/50",
        ghostInk:
          "bg-ember/25 text-ticket-ink border-ember-deep/30 hover:bg-ember/40",
        danger:
          "bg-rose text-white border-rose hover:bg-rose/90",
        icon:
          "bg-lime/40 border-lime-deep/35 text-ink hover:bg-lime/55 hover:border-lime-deep/50",
        iconInk:
          "bg-ember/25 border-ember-deep/30 text-ticket-ink hover:bg-ember/40"
      },
      size: {
        xs: "h-9 px-3.5 text-[11px]",
        sm: "h-11 px-5 text-xs",
        md: "h-12 px-6 text-sm",
        lg: "h-[52px] px-7 text-base",
        icon: "h-12 w-12 px-0",
        iconSm: "h-10 w-10 px-0"
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

type PressableStyle = React.CSSProperties & {
  "--press-shadow"?: string;
  "--press-depth"?: string;
};

const variantInlineStyle: Partial<Record<NonNullable<ButtonProps["variant"]>, PressableStyle>> = {
  primary: {
    color: "#ffffff",
    backgroundColor: "#4f98a2",
    "--press-shadow": "#356f77"
  },
  ember: {
    color: "#26345c",
    backgroundColor: "#e8a49b",
    "--press-shadow": "#ba746d"
  },
  sage: {
    color: "#26345c",
    backgroundColor: "#bdd0bf",
    "--press-shadow": "#8da190"
  },
  ink: {
    color: "#ffffff",
    backgroundColor: "#26345c",
    "--press-shadow": "#17213e"
  },
  ghost: { "--press-shadow": "rgba(38, 52, 92, 0.18)", "--press-depth": "2px" },
  ghostInk: { "--press-shadow": "rgba(38, 52, 92, 0.18)", "--press-depth": "2px" },
  danger: {
    color: "#ffffff",
    backgroundColor: "#cf666d",
    "--press-shadow": "#984047"
  },
  icon: { "--press-shadow": "rgba(38, 52, 92, 0.18)", "--press-depth": "2px" },
  iconInk: { "--press-shadow": "rgba(38, 52, 92, 0.18)", "--press-depth": "2px" }
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
