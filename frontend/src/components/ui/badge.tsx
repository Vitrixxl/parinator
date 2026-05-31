import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("stamp", {
  variants: {
    tone: {
      live:    "text-ember-deep bg-ember/12",
      done:    "text-jade bg-jade/12",
      pending: "text-amber bg-amber/12",
      declined:"text-rose bg-rose/12",
      ink:     "text-ticket-ink bg-ticket-ink/5",
      lime:    "text-lime-dark bg-lime/15"
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
