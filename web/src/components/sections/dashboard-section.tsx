"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Gauge,
  MemoryStick,
  Server,
  Timer,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/atlas/kpi-card";
import { StatusDot } from "@/components/atlas/status-dot";
import {
  fetchServices,
  fetchIncidents,
  fetchMetricsSnapshot,
} from "@/lib/api";
import {
  formatRelative,
  formatUnixMinute,
  formatUptime,
  statusColor,
} from "@/lib/format";
import type {
  ServiceInfo,
  Incident,
  MetricsSnapshot,
} from "@/lib/types";

export function DashboardSection() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [s, i, m] = await Promise.all([
        fetchServices(),
        fetchIncidents(),
        fetchMetricsSnapshot(),
      ]);
      if (cancelled) return;
      setServices(s);
      setIncidents(i);
      setMetrics(m);
      setLoading(false);
    }
    load();
    
    const interval = setInterval(async () => {
      const m = await fetchMetricsSnapshot();
      if (!cancelled) setMetrics(m);
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const healthyCount = services.filter((s) => s.status === "healthy").length;
  const degradedCount = services.filter((s) => s.status === "degraded").length;
  const unhealthyCount = services.filter((s) => s.status === "unhealthy").length;
  const activeIncidents = incidents.filter((i) => !i.resolved);
  const uptime = metrics?.current.uptime_seconds ?? 0;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-lg border border-border bg-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="rounded-xl border border-border bg-gradient-to-br from-card to-card/50 p-6 scanlines"
      >
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <StatusDot status={unhealthyCount > 0 ? "unhealthy" : degradedCount > 0 ? "degraded" : "healthy"} />
              <h2 className="text-xl font-semibold">
                {unhealthyCount > 0
                  ? "System requires attention"
                  : degradedCount > 0
                    ? "System is running with degradation"
                    : "All systems nominal"}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              {healthyCount} of {services.length} services healthy.
              {" "}
              {activeIncidents.length > 0
                ? `${activeIncidents.length} active incidents.`
                : "No active incidents."}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              Uptime
            </div>
            <div className="font-mono text-2xl text-status-healthy">
              {formatUptime(uptime)}
            </div>
          </div>
        </div>
      </motion.div>

      {}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Services up"
          value={`${healthyCount}/${services.length}`}
          icon={<Server className="w-4 h-4" />}
          trend={`${degradedCount} degraded, ${unhealthyCount} unhealthy`}
          trendDirection={unhealthyCount > 0 ? "down" : degradedCount > 0 ? "neutral" : "up"}
        />
        <KpiCard
          label="CPU usage"
          value={metrics?.current.cpu.toFixed(1) ?? "—"}
          unit="%"
          icon={<Cpu className="w-4 h-4" />}
          trend={metrics && metrics.current.cpu > 80 ? "high" : "normal"}
          trendDirection={metrics && metrics.current.cpu > 80 ? "down" : "up"}
        />
        <KpiCard
          label="Memory"
          value={metrics?.current.memory.toFixed(1) ?? "—"}
          unit="%"
          icon={<MemoryStick className="w-4 h-4" />}
          trend={metrics && metrics.current.memory > 90 ? "high" : "normal"}
          trendDirection={metrics && metrics.current.memory > 90 ? "down" : "up"}
        />
        <KpiCard
          label="P95 latency"
          value={metrics?.current.latency.toFixed(0) ?? "—"}
          unit="ms"
          icon={<Gauge className="w-4 h-4" />}
          trend={metrics && metrics.current.latency > 500 ? "high" : "normal"}
          trendDirection={metrics && metrics.current.latency > 500 ? "down" : "up"}
        />
      </div>

      {}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="CPU & Memory"
          subtitle="Last hour, %"
          icon={<Activity className="w-4 h-4" />}
        >
          {metrics && (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={metrics.series[0].points.map((p, i) => ({
                  t: formatUnixMinute(p.t),
                  cpu: p.value,
                  memory: metrics.series[1].points[i].value,
                }))}
              >
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.18 145)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.72 0.18 145)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.78 0.18 75)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.78 0.18 75)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0 / 40%)" />
                <XAxis dataKey="t" stroke="oklch(0.6 0 0)" fontSize={10} tickLine={false} />
                <YAxis stroke="oklch(0.6 0 0)" fontSize={10} domain={[0, 100]} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.16 0 0)",
                    border: "1px solid oklch(0.3 0 0)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="cpu" stroke="oklch(0.72 0.18 145)" fill="url(#cpuGrad)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="memory" stroke="oklch(0.78 0.18 75)" fill="url(#memGrad)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Request rate"
          subtitle="Last hour, rps"
          icon={<Activity className="w-4 h-4" />}
        >
          {metrics && (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={metrics.series[2].points.map((p) => ({
                  t: formatUnixMinute(p.t),
                  rps: p.value,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0 / 40%)" />
                <XAxis dataKey="t" stroke="oklch(0.6 0 0)" fontSize={10} tickLine={false} />
                <YAxis stroke="oklch(0.6 0 0)" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.16 0 0)",
                    border: "1px solid oklch(0.3 0 0)",
                    borderRadius: "0.5rem",
                    fontSize: "12px",
                  }}
                />
                <Line type="monotone" dataKey="rps" stroke="oklch(0.7 0.18 250)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Server className="w-4 h-4" />
            Services
          </h3>
          <span className="text-xs text-muted-foreground">{services.length} total</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {services.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
              className="flex items-center justify-between p-2 rounded border border-border/50 hover:bg-accent/30 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <StatusDot status={s.status} />
                <span className="font-mono text-sm truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className={statusColor(s.status)}>{s.status}</span>
                <span className="font-mono">:{s.port}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Active incidents
          </h3>
          <span className="text-xs text-muted-foreground">
            {activeIncidents.length} active
          </span>
        </div>
        {activeIncidents.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <CheckCircle2 className="w-4 h-4 text-status-healthy" />
            No active incidents. All quiet.
          </div>
        ) : (
          <div className="space-y-2">
            {activeIncidents.map((inc, i) => (
              <motion.div
                key={inc.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: i * 0.06 }}
                className="flex items-start gap-3 p-3 rounded border border-border/50 bg-background/40"
              >
                <AlertTriangle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    inc.severity === "critical"
                      ? "text-status-unhealthy"
                      : inc.severity === "warning"
                        ? "text-status-degraded"
                        : "text-status-healthy"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-mono truncate">{inc.title}</span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">
                      {inc.service}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {inc.description}
                  </p>
                </div>
                <div className="text-xs text-muted-foreground font-mono shrink-0 flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  {formatRelative(inc.created_at)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            {icon}
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
