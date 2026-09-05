"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Filter, Timer } from "lucide-react";
import { fetchIncidents } from "@/lib/api";
import {
  formatRelative,
  formatTime,
  severityBadgeClasses,
  severityColor,
} from "@/lib/format";
import type { Incident, Severity } from "@/lib/types";

export function IncidentsSection() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filterSeverity, setFilterSeverity] = useState<Severity | "all">("all");
  const [filterResolved, setFilterResolved] = useState<"all" | "active" | "resolved">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchIncidents().then((items) => {
      if (cancelled) return;
      setIncidents(items);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = incidents.filter((inc) => {
    if (filterSeverity !== "all" && inc.severity !== filterSeverity) return false;
    if (filterResolved === "active" && inc.resolved) return false;
    if (filterResolved === "resolved" && !inc.resolved) return false;
    return true;
  });

  const activeCount = incidents.filter((i) => !i.resolved).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Incidents timeline
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {incidents.length} total · {activeCount} active
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {}
            <div className="flex rounded border border-border overflow-hidden text-xs">
              {(["all", "critical", "warning", "info"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterSeverity(s)}
                  className={`px-2.5 py-1 font-mono uppercase transition-colors ${
                    filterSeverity === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {}
            <div className="flex rounded border border-border overflow-hidden text-xs">
              {(["all", "active", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterResolved(s)}
                  className={`px-2.5 py-1 font-mono capitalize transition-colors ${
                    filterResolved === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-card hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="rounded-lg border border-border bg-card p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <CheckCircle2 className="w-4 h-4 text-status-healthy" />
            No incidents match the selected filters.
          </div>
        ) : (
          <div className="relative">
            {}
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-4">
              {filtered.map((inc, i) => (
                <motion.div
                  key={inc.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.04 }}
                  className="relative pl-10"
                >
                  {}
                  <div
                    className={`absolute left-2 top-3 w-3.5 h-3.5 rounded-full border-2 border-card ${
                      inc.severity === "critical"
                        ? "bg-status-unhealthy"
                        : inc.severity === "warning"
                          ? "bg-status-degraded"
                          : "bg-status-healthy"
                    } ${!inc.resolved ? "ring-2 ring-offset-2 ring-offset-card ring-current" : ""}`}
                  />

                  <div
                    className={`rounded-lg border p-3 ${
                      inc.resolved
                        ? "border-border bg-background/30"
                        : "border-border bg-background/60"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide border ${severityBadgeClasses(inc.severity).split(" ").slice(-3).join(" ")} ${severityBadgeClasses(inc.severity).split(" ").slice(0, 4).join(" ")}`}
                        >
                          {inc.severity}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {inc.service}
                        </span>
                        {inc.resolved ? (
                          <span className="flex items-center gap-1 text-[10px] text-status-healthy font-mono">
                            <CheckCircle2 className="w-3 h-3" />
                            resolved
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-status-unhealthy font-mono">
                            <AlertTriangle className="w-3 h-3" />
                            active
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        {formatRelative(inc.created_at)}
                      </span>
                    </div>

                    <h4 className="font-mono text-sm font-medium mb-1">
                      {inc.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {inc.description}
                    </p>

                    <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground font-mono">
                      <span>started: {formatTime(inc.created_at)}</span>
                      {inc.resolved_at && (
                        <span>resolved: {formatTime(inc.resolved_at)}</span>
                      )}
                      {inc.duration_seconds && (
                        <span className={severityColor(inc.severity)}>
                          duration: {Math.floor(inc.duration_seconds / 60)}m
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
