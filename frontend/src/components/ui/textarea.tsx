import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: "ink" | "dark";
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, tone = "ink", ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        tone === "ink" ? "field" : "field-dark",
        "min-h-[96px] resize-y leading-relaxed",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
