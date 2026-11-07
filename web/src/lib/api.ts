import type { Architecture, Incident, MetricsSnapshot, Runbook, ServiceInfo } from "./types";

// Defaults to the API's local port; set NEXT_PUBLIC_API_URL at build time otherwise.
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function get<T>(path: string, timeoutMs = 5000): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/** True when the API answers its liveness probe. */
export async function pingApi(): Promise<boolean> {
  return (await get<{ status: string }>("/health", 2000)) !== null;
}

// Live data: an empty result means the API or Prometheus is unavailable.
export const fetchServices = async () => (await get<ServiceInfo[]>("/api/services")) ?? [];
export const fetchIncidents = async () => (await get<Incident[]>("/api/incidents?limit=100")) ?? [];
export const fetchMetricsSnapshot = () => get<MetricsSnapshot>("/api/metrics/snapshot");

// Documentation endpoints; the dashboard ships a copy to show while offline.
export const fetchArchitecture = () => get<Architecture>("/api/architecture");
export const fetchRunbooks = () => get<Runbook[]>("/api/runbook");
