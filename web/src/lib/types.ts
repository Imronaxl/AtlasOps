// Mirrors the response models in api/src/routes.

export type SectionId = "dashboard" | "architecture" | "services" | "incidents" | "runbook" | "api" | "cli";

export type ServiceStatus = "healthy" | "degraded" | "unhealthy" | "unknown";
export type Severity = "critical" | "warning" | "info";

export interface ServiceInfo {
  name: string;
  kind: string;
  status: ServiceStatus;
  port: number;
  image: string;
  uptime_seconds: number | null;
  description: string;
  depends_on: string[];
}

export interface Incident {
  id: number;
  service: string;
  severity: Severity;
  title: string;
  description: string;
  created_at: string;
  resolved_at: string | null;
  resolved: boolean;
  duration_seconds: number | null;
}

export interface MetricPoint {
  t: number;
  value: number;
}

export interface MetricSeries {
  name: "cpu" | "memory" | "requests" | "latency" | "errors";
  unit: string;
  points: MetricPoint[];
}

export interface MetricsSnapshot {
  generated_at: number;
  series: MetricSeries[];
  current: {
    cpu: number;
    memory: number;
    requests: number;
    latency: number;
    errors: number;
    uptime_seconds: number;
  };
}

export type ArchKind = "external" | "proxy" | "app" | "db" | "cache" | "monitor" | "exporter";

export interface ArchNode {
  id: string;
  label: string;
  kind: ArchKind;
  port: number | null;
  description: string;
  x: number;
  y: number;
}

export interface ArchEdge {
  source: string;
  target: string;
  label: string;
  kind: "http" | "scrape" | "depend";
}

export interface Architecture {
  nodes: ArchNode[];
  edges: ArchEdge[];
  legend: Record<string, string>;
}

export interface RunbookStep {
  title: string;
  description: string;
  command: string | null;
  expected: string;
}

export interface Runbook {
  id: string;
  title: string;
  summary: string;
  severity: string;
  steps: RunbookStep[];
}

export interface ApiEndpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  curl: string;
  response_example: string;
}

export interface CliStep {
  command: string;
  description: string;
  output: string[];
}
