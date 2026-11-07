import type { ServiceStatus, Severity } from "./types";

const KINDS: Record<string, { icon: string; label: string }> = {
  external: { icon: "🌐", label: "External" },
  proxy: { icon: "🛡️", label: "Reverse proxy" },
  app: { icon: "⚙️", label: "Application" },
  db: { icon: "🗄️", label: "Database" },
  cache: { icon: "⚡", label: "Cache" },
  monitor: { icon: "📈", label: "Monitoring" },
  exporter: { icon: "📤", label: "Exporter" },
};

export const kindIcon = (kind: string): string => KINDS[kind]?.icon ?? "•";
export const kindLabel = (kind: string): string => KINDS[kind]?.label ?? kind;

export function formatUptime(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${Math.floor(seconds)}s`;
}

export function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatUnixMinute(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function statusColor(status: ServiceStatus): string {
  return {
    healthy: "text-status-healthy",
    degraded: "text-status-degraded",
    unhealthy: "text-status-unhealthy",
    unknown: "text-status-unknown",
  }[status];
}

// The status-* classes are defined in app/globals.css.
export function statusBadgeClasses(status: ServiceStatus): string {
  return `bg-status-${status} text-status-${status} border-status-${status}`;
}

export function severityColor(severity: string): string {
  return (
    { critical: "text-status-unhealthy", warning: "text-status-degraded", info: "text-sky-400" }[
      severity as Severity
    ] ?? "text-muted-foreground"
  );
}

export function severityBadgeClasses(severity: string): string {
  return (
    {
      critical: statusBadgeClasses("unhealthy"),
      warning: statusBadgeClasses("degraded"),
      info: "bg-sky-400/10 text-sky-400 border-sky-400/30",
    }[severity as Severity] ?? statusBadgeClasses("unknown")
  );
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
