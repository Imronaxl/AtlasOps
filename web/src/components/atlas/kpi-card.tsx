"use client";

import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendDirection = "neutral",
  className,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
  className?: string;
}) {
  const trendColor =
    trendDirection === "up"
      ? "text-status-healthy"
      : trendDirection === "down"
        ? "text-status-unhealthy"
        : "text-muted-foreground";

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 glow-hover",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-mono font-semibold">{value}</span>
        {unit && (
          <span className="text-xs text-muted-foreground font-mono">{unit}</span>
        )}
      </div>
      {trend && (
        <div className={cn("text-xs mt-1 font-mono", trendColor)}>{trend}</div>
      )}
    </div>
  );
}
