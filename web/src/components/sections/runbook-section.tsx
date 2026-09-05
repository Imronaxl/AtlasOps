"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronDown, ChevronRight, Terminal } from "lucide-react";
import { fetchRunbooks } from "@/lib/api";
import { MOCK_RUNBOOKS } from "@/lib/mock-data";
import { severityBadgeClasses } from "@/lib/format";
import { CodeBlock } from "@/components/atlas/code-block";
import type { Runbook } from "@/lib/types";

/** Runbook: operational procedures with step-by-step instructions. */
export function RunbookSection() {
  const [runbooks, setRunbooks] = useState<Runbook[]>(MOCK_RUNBOOKS);
  const [open, setOpen] = useState<string | null>("deploy");

  useEffect(() => {
    let cancelled = false;
    fetchRunbooks().then((r) => {
      if (cancelled) return;
      setRunbooks(r);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
          <BookOpen className="w-5 h-5" />
          Runbook
        </h2>
        <p className="text-xs text-muted-foreground">
          Operational procedures: what to do in a specific situation. Each
          procedure is a step-by-step checklist with commands.
        </p>
      </div>

      <div className="space-y-3">
        {runbooks.map((rb, i) => {
          const isOpen = open === rb.id;
          return (
            <motion.div
              key={rb.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : rb.id)}
                className="w-full flex items-center justify-between gap-3 p-4 hover:bg-accent/30 transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-semibold">{rb.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${severityBadgeClasses(rb.severity).split(" ").slice(-3).join(" ")} ${severityBadgeClasses(rb.severity).split(" ").slice(0, 4).join(" ")}`}
                      >
                        {rb.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                      {rb.summary}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">
                  {rb.steps.length} steps
                </span>
              </button>

              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-border p-4 space-y-4"
                >
                  <p className="text-sm text-muted-foreground">{rb.summary}</p>
                  {rb.steps.map((step, j) => (
                    <div
                      key={j}
                      className="rounded border border-border/50 bg-background/40 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-mono flex items-center justify-center mt-0.5">
                          {j + 1}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <h4 className="text-sm font-medium">{step.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {step.description}
                          </p>
                          {step.command && (
                            <div className="flex items-start gap-2">
                              <Terminal className="w-3.5 h-3.5 mt-1 text-muted-foreground shrink-0" />
                              <CodeBlock code={step.command} className="flex-1" />
                            </div>
                          )}
                          {step.expected && (
                            <div className="flex items-start gap-2 text-xs">
                              <span className="text-status-healthy shrink-0 font-mono">
                                expected:
                              </span>
                              <span className="text-muted-foreground">
                                {step.expected}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
