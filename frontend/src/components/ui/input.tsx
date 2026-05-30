import * as React from "react";
import { cn } from "@/lib/utils";

export type InputTone = "ink" | "dark";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  tone?: InputTone;
  mono?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, tone = "ink", mono = false, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(tone === "ink" ? "field" : "field-dark", mono && "field-mono", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";
