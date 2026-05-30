import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("stamp", {
  variants: {
    tone: {
      live:    "text-ember bg-ember/10",
      done:    "text-jade bg-jade/10",
      pending: "text-amber bg-amber/10",
      declined:"text-rose bg-rose/10",
      ink:     "text-ticket-ink bg-ticket-ink/5",
      lime:    "text-lime bg-lime/10"
    },
    align: {
      tilt: "",
      flat: "stamp-flat"
    }
  },
  defaultVariants: { tone: "live", align: "tilt" }
});

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone, align, ...props }, ref) => (
    <span ref={ref} className={cn(badgeVariants({ tone, align }), className)} {...props} />
  )
);
Badge.displayName = "Badge";
