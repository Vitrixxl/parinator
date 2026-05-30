import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("ticket p-5 lift", className)} {...props} />
  )
);
Card.displayName = "Card";

export const CardDark = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("ticket ticket-dark p-5", className)} {...props} />
  )
);
CardDark.displayName = "CardDark";

export const CardSection = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-3", className)} {...props} />
  )
);
CardSection.displayName = "CardSection";
