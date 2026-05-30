import * as React from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  tone?: "ink" | "dark";
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, tone = "ink", ...props }, ref) => (
    <label
      ref={ref}
      className={cn(tone === "ink" ? "label-ink" : "label-dim", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
