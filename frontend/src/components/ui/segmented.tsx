import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: SegmentOption<T>[];
  tone?: "ink" | "dark";
  className?: string;
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  tone = "dark",
  className
}: SegmentedProps<T>) {
  const ink = tone === "ink";
  return (
    <div
      role="tablist"
      className={cn(
        "relative grid p-1.5 rounded-2xl border",
        ink
          ? "bg-ticket-warm/60 border-ticket-edge"
          : "bg-surface border-edge",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            style={
              active
                ? ink
                  ? { color: "#ffffff", backgroundColor: "#3b3450" }
                  : { color: "#241a52", backgroundColor: "#9a8bf2" }
                : undefined
            }
            className={cn(
              "relative z-10 h-10 px-3 inline-flex items-center justify-center gap-1.5 font-display uppercase tracking-[0.06em] text-xs transition-colors min-w-0 truncate rounded-xl",
              active
                ? ink
                  ? "font-bold shadow-[inset_0_-3px_0_var(--color-iris),0_2px_0_rgba(59,52,80,0.25)]"
                  : "font-bold shadow-[0_2px_0_var(--color-iris-deep)]"
                : ink
                  ? "text-ticket-ink-dim hover:text-ticket-ink"
                  : "text-ink-dim hover:text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
