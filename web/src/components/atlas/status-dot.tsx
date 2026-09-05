"use client";

import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/types";

/** Pulsing status dot — like Grafana. */
export function StatusDot({
  status,
  className,
}: {
  status: ServiceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn("status-dot", status, className)}
      role="img"
      aria-label={status}
    />
  );
}
