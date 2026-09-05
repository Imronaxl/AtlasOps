"use client";

import { cn } from "@/lib/utils";
import { statusBadgeClasses } from "@/lib/format";
import type { ServiceStatus } from "@/lib/types";
import { StatusDot } from "./status-dot";

export function StatusBadge({
  status,
  className,
  withDot = true,
}: {
  status: ServiceStatus;
  className?: string;
  withDot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono border",
        statusBadgeClasses(status).split(" ").slice(-3).join(" "),
        statusBadgeClasses(status).split(" ").slice(0, 4).join(" "),
        className,
      )}
    >
      {withDot && <StatusDot status={status} className="!w-1.5 !h-1.5" />}
      <span>{status}</span>
    </span>
  );
}
