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

const segmentPalette = [
  {
    background: "#bdd0bf",
    foreground: "#26345c",
    border: "#9cac9d",
    soft: "rgba(189, 208, 191, 0.42)",
    softBorder: "rgba(156, 172, 157, 0.42)",
    text: "#26345c"
  },
  {
    background: "#e8a49b",
    foreground: "#26345c",
    border: "#b45c56",
    soft: "rgba(232, 164, 155, 0.32)",
    softBorder: "rgba(180, 92, 86, 0.32)",
    text: "#783f3f"
  },
  {
    background: "#4f98a2",
    foreground: "#ffffff",
    border: "#3f7f89",
    soft: "rgba(79, 152, 162, 0.18)",
    softBorder: "rgba(63, 127, 137, 0.32)",
    text: "#285f68"
  },
  {
    background: "#cf666d",
    foreground: "#ffffff",
    border: "#984047",
    soft: "rgba(207, 102, 109, 0.16)",
    softBorder: "rgba(152, 64, 71, 0.28)",
    text: "#84363d"
  },
  {
    background: "#26345c",
    foreground: "#ffffff",
    border: "#17213e",
    soft: "rgba(38, 52, 92, 0.10)",
    softBorder: "rgba(38, 52, 92, 0.22)",
    text: "#26345c"
  }
];

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
        "relative grid p-2 rounded-xl border gap-1.5",
        ink
          ? "bg-ticket-warm/75 border-ticket-edge"
          : "bg-surface/80 border-edge",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((option, index) => {
        const active = option.value === value;
        const palette = segmentPalette[index % segmentPalette.length];
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            style={{
              color: active ? palette.foreground : palette.text,
              backgroundColor: active ? palette.background : palette.soft,
              borderColor: active ? palette.border : palette.softBorder
            }}
            className={cn(
              "relative z-10 h-11 px-4 inline-flex items-center justify-center gap-1.5 border font-bold tracking-normal text-xs transition-colors min-w-0 truncate rounded-lg",
              active ? "font-bold" : ink ? "hover:text-ticket-ink" : "hover:text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
