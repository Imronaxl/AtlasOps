"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Code2, Terminal } from "lucide-react";
import { MOCK_API_ENDPOINTS } from "@/lib/mock-data";
import { CodeBlock } from "@/components/atlas/code-block";
import type { ApiEndpoint } from "@/lib/types";

export function ApiSection() {
  const [selected, setSelected] = useState<ApiEndpoint>(MOCK_API_ENDPOINTS[0]);

  const methodColor = (m: ApiEndpoint["method"]) => {
    switch (m) {
      case "GET": return "text-status-healthy border-status-healthy bg-status-healthy";
      case "POST": return "text-status-degraded border-status-degraded bg-status-degraded";
      case "PUT": return "text-blue-400 border-blue-400/40 bg-blue-400/10";
      case "DELETE": return "text-status-unhealthy border-status-unhealthy bg-status-unhealthy";
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <Code2 className="w-5 h-5" />
          API Explorer
        </h2>
        <p className="text-xs text-muted-foreground">
          All FastAPI endpoints: what they return and how to call them with curl.
          Handy to open the route source next to the response example during an interview.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {}
        <div className="rounded-lg border border-border bg-card p-2 max-h-[600px] overflow-y-auto atlas-scroll">
          <div className="space-y-1">
            {MOCK_API_ENDPOINTS.map((ep) => (
              <button
                key={ep.path}
                type="button"
                onClick={() => setSelected(ep)}
                className={`w-full text-left p-2 rounded transition-colors ${
                  selected.path === ep.path
                    ? "bg-primary/15 border border-primary/30"
                    : "hover:bg-accent/30 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${methodColor(ep.method)}`}
                  >
                    {ep.method}
                  </span>
                </div>
                <div className="font-mono text-xs truncate">{ep.path}</div>
              </button>
            ))}
          </div>
        </div>

        {}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.path}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-mono font-bold border ${methodColor(selected.method)}`}
                  >
                    {selected.method}
                  </span>
                  <code className="font-mono text-sm font-semibold">{selected.path}</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selected.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  curl
                </h4>
                <CodeBlock code={selected.curl} />
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Response example
                </h4>
                <CodeBlock
                  code={selected.response_example}
                  language="json"
                  showCopy={false}
                />
              </div>

              <div className="rounded border border-border/50 bg-background/40 p-3 text-xs">
                <div className="text-muted-foreground mb-1 font-mono">
                  Source:
                </div>
                <code className="font-mono text-xs">
                  {selected.path.startsWith("/api/")
                    ? `atlasops/api/src/routes/${selected.path.split("/")[2]}.py`
                    : "atlasops/api/src/routes/" +
                      (selected.path === "/health" || selected.path === "/ready"
                        ? "health.py"
                        : selected.path === "/status"
                          ? "status.py"
                          : selected.path === "/metrics"
                            ? "main.py"
                            : "_.py")}
                </code>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
