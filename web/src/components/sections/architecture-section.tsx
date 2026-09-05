"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Boxes, X } from "lucide-react";
import { fetchArchitecture } from "@/lib/api";
import { MOCK_ARCHITECTURE } from "@/lib/mock-data";
import {
  kindIcon,
  kindLabel,
  statusColor,
} from "@/lib/format";
import type { Architecture, ArchNode, ServiceStatus } from "@/lib/types";

/** Architecture: interactive diagram of all services and connections. */
export function ArchitectureSection() {
  const [arch, setArch] = useState<Architecture>(MOCK_ARCHITECTURE);
  const [selected, setSelected] = useState<ArchNode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchArchitecture().then((a) => {
      if (cancelled) return;
      setArch(a);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Node coords: x in 1..11, y in -1..3. Map to percentages of the area.
  // We do this here (not on the backend) so the backend does not know about CSS.
  const xToPct = (x: number) => ((x - 1) / 10) * 90 + 5;
  const yToPct = (y: number) => ((3 - y) / 4) * 80 + 10;

  // Edges: compute node centers to draw arrows.
  const edgesWithCoords = arch.edges.map((e) => {
    const source = arch.nodes.find((n) => n.id === e.source);
    const target = arch.nodes.find((n) => n.id === e.target);
    return {
      ...e,
      x1: source ? xToPct(source.x) : 0,
      y1: source ? yToPct(source.y) : 0,
      x2: target ? xToPct(target.x) : 0,
      y2: target ? yToPct(target.y) : 0,
    };
  });

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Boxes className="w-5 h-5" />
              Service topology
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Click a block for details. Arrows:{" "}
              <span className="text-status-healthy">http</span>{" "}
              <span className="text-status-degraded">scrape</span>{" "}
              <span className="text-muted-foreground">depend</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(arch.legend)
              .filter(([k]) => ["external", "proxy", "app", "db", "cache", "monitor", "exporter"].includes(k))
              .map(([k, v]) => (
                <span
                  key={k}
                  className="px-2 py-1 rounded border border-border/60 bg-background/40"
                  title={v}
                >
                  {kindIcon(k as any)} {k}
                </span>
              ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div
          className="relative arch-grid"
          style={{ height: "540px" }}
        >
          {/* SVG with arrows — drawn under the nodes */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            preserveAspectRatio="none"
          >
            <defs>
              <marker
                id="arrow-http"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="oklch(0.72 0.18 145)" />
              </marker>
              <marker
                id="arrow-scrape"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="oklch(0.78 0.18 75)" />
              </marker>
              <marker
                id="arrow-depend"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
              >
                <path d="M0,0 L8,4 L0,8 Z" fill="oklch(0.6 0 0)" />
              </marker>
            </defs>
            {edgesWithCoords.map((e, i) => {
              const color =
                e.kind === "http"
                  ? "oklch(0.72 0.18 145)"
                  : e.kind === "scrape"
                    ? "oklch(0.78 0.18 75)"
                    : "oklch(0.6 0 0)";
              const dash =
                e.kind === "scrape" ? "4 4" : e.kind === "depend" ? "2 4" : "none";
              return (
                <g key={i}>
                  <line
                    x1={`${e.x1}%`}
                    y1={`${e.y1}%`}
                    x2={`${e.x2}%`}
                    y2={`${e.y2}%`}
                    stroke={color}
                    strokeWidth={1.2}
                    strokeDasharray={dash}
                    markerEnd={`url(#arrow-${e.kind})`}
                    opacity={0.5}
                  />
                  <text
                    x={`${(e.x1 + e.x2) / 2}%`}
                    y={`${(e.y1 + e.y2) / 2 - 1}%`}
                    fill="oklch(0.6 0 0)"
                    fontSize="9"
                    textAnchor="middle"
                    fontFamily="monospace"
                    opacity={0.7}
                  >
                    {e.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {arch.nodes.map((node, i) => (
            <motion.button
              key={node.id}
              type="button"
              onClick={() => setSelected(node)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              whileHover={{ scale: 1.05, zIndex: 10 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{
                left: `${xToPct(node.x)}%`,
                top: `${yToPct(node.y)}%`,
              }}
            >
              <div
                className={`px-3 py-2 rounded-lg border bg-card hover:border-primary/60 transition-colors min-w-[110px] ${
                  selected?.id === node.id
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{kindIcon(node.kind)}</span>
                  <span className="font-mono text-sm font-semibold">{node.label}</span>
                </div>
                {node.port && (
                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5 text-left">
                    :{node.port}
                  </div>
                )}
              </div>
            </motion.button>
          ))}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
              Loading architecture...
            </div>
          )}
        </div>
      </div>

      {/* Edge legend */}
      <div className="rounded-lg border border-border bg-card p-3 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-6 h-px bg-status-healthy inline-block" />
          <span className="font-mono">http</span>
          <span className="text-muted-foreground">— regular HTTP call</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 inline-block border-t border-dashed border-status-degraded" />
          <span className="font-mono">scrape</span>
          <span className="text-muted-foreground">— Prometheus pulls metrics</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-6 inline-block border-t border-dotted border-muted-foreground" />
          <span className="font-mono">depend</span>
          <span className="text-muted-foreground">— hard runtime dependency</span>
        </div>
      </div>

      {/* Node details modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-lg p-6 max-w-md w-full relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 p-1 rounded hover:bg-accent"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{kindIcon(selected.kind)}</span>
                <div>
                  <h3 className="text-lg font-semibold font-mono">{selected.label}</h3>
                  <span className="text-xs text-muted-foreground">
                    {kindLabel(selected.kind)}
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {selected.description}
              </p>
              <div className="space-y-2 text-sm">
                {selected.port && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Port</span>
                    <span className="font-mono">:{selected.port}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kind</span>
                  <span className="font-mono">{selected.kind}</span>
                </div>
                {arch.edges
                  .filter((e) => e.source === selected.id || e.target === selected.id)
                  .length > 0 && (
                  <div>
                    <div className="text-muted-foreground mb-1 font-mono">
                      Connections
                    </div>
                    <div className="space-y-1">
                      {arch.edges
                        .filter((e) => e.source === selected.id || e.target === selected.id)
                        .map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs font-mono">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                e.kind === "http"
                                  ? "bg-status-healthy"
                                  : e.kind === "scrape"
                                    ? "bg-status-degraded"
                                    : "bg-muted-foreground"
                              }`}
                            />
                            <span>{e.source}</span>
                            <span className="text-muted-foreground">→</span>
                            <span>{e.target}</span>
                            <span className="text-muted-foreground ml-1">({e.label})</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
