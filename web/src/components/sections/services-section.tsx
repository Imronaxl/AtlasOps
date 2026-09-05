"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Server } from "lucide-react";
import { fetchServices } from "@/lib/api";
import { MOCK_SERVICES } from "@/lib/mock-data";
import {
  formatUptime,
  kindIcon,
  kindLabel,
  statusColor,
} from "@/lib/format";
import type { ServiceInfo } from "@/lib/types";
import { StatusDot } from "@/components/atlas/status-dot";

export function ServicesSection() {
  const [services, setServices] = useState<ServiceInfo[]>(MOCK_SERVICES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchServices().then((s) => {
      if (cancelled) return;
      setServices(s);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Server className="w-5 h-5" />
          Services registry
        </h2>
        <p className="text-xs text-muted-foreground">
          {services.length} services. Health-check every 15s.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto atlas-scroll">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background/40">
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Service</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Kind</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Port</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">Image</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground">Uptime</th>
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Depends on</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s, i) => (
                <motion.tr
                  key={s.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className="border-b border-border/50 hover:bg-accent/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none">{kindIcon(s.kind)}</span>
                      <div>
                        <div className="font-mono font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">
                          {s.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-muted-foreground">
                      {kindLabel(s.kind)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <StatusDot status={s.status} />
                      <span className={`text-xs font-mono ${statusColor(s.status)}`}>
                        {s.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">:{s.port}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.image}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs">
                      {formatUptime(s.uptime_seconds)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {s.depends_on.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.depends_on.map((d) => (
                          <span
                            key={d}
                            className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent/40 border border-border/50"
                          >
                            {d}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="rounded-lg border border-border bg-card p-4 glow-hover"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{kindIcon(s.kind)}</span>
                <div>
                  <div className="font-mono font-semibold">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {kindLabel(s.kind)}
                  </div>
                </div>
              </div>
              <StatusDot status={s.status} />
            </div>
            <p className="text-sm text-muted-foreground mb-3">{s.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-background/40 p-2">
                <div className="text-muted-foreground mb-0.5">Port</div>
                <div className="font-mono">:{s.port}</div>
              </div>
              <div className="rounded bg-background/40 p-2">
                <div className="text-muted-foreground mb-0.5">Uptime</div>
                <div className="font-mono">{formatUptime(s.uptime_seconds)}</div>
              </div>
            </div>
            {s.depends_on.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-1">Depends on</div>
                <div className="flex flex-wrap gap-1">
                  {s.depends_on.map((d) => (
                    <span
                      key={d}
                      className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-accent/40 border border-border/50"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
