"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Terminal as TerminalIcon, Play, Pause, RotateCcw } from "lucide-react";
import { MOCK_CLI_DEMO } from "@/lib/mock-data";

/** CLI: animated terminal demo with typical make commands. */
export function CliSection() {
  const [stepIdx, setStepIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [visibleLines, setVisibleLines] = useState(0);
  const [showCommand, setShowCommand] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const step = MOCK_CLI_DEMO[stepIdx];

  // Typing effect for the command and a line-by-line reveal of the output.
  useEffect(() => {
    if (!playing) return;

    // Reset state via microtask to avoid a synchronous re-render inside
    // the effect body (React 19 lint rule).
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setShowCommand(false);
      setVisibleLines(0);
    });

    // 1. Show the command immediately.
    const cmdTimer = setTimeout(() => {
      if (!cancelled) setShowCommand(true);
    }, 200);

    // 2. Reveal output line by line.
    let lineIdx = 0;
    // Store the next-step timer id in a closure variable.
    // Earlier we tried to attach a property to a number, which crashed.
    let nextTimer: ReturnType<typeof setTimeout> | null = null;
    const lineTimer = setInterval(() => {
      if (cancelled) return;
      lineIdx += 1;
      setVisibleLines(lineIdx);
      if (lineIdx >= step.output.length) {
        clearInterval(lineTimer);
        // 3. Wait and switch to the next step.
        nextTimer = setTimeout(() => {
          if (!cancelled) setStepIdx((prev) => (prev + 1) % MOCK_CLI_DEMO.length);
        }, 1800);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(cmdTimer);
      clearInterval(lineTimer);
      if (nextTimer) clearTimeout(nextTimer);
    };
  }, [stepIdx, playing, step.output.length]);

  // Auto-scroll to bottom.
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleLines, showCommand]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <TerminalIcon className="w-5 h-5" />
              CLI demo
            </h2>
            <p className="text-xs text-muted-foreground">
              Live demo of typical operations. Commands come from the AtlasOps Makefile.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs hover:bg-accent transition-colors"
            >
              {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStepIdx(0);
                setPlaying(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs hover:bg-accent transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Restart
            </button>
          </div>
        </div>
      </div>

      {/* Step progress */}
      <div className="flex flex-wrap gap-1.5">
        {MOCK_CLI_DEMO.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStepIdx(i)}
            className={`px-2 py-1 rounded text-[10px] font-mono border transition-colors ${
              i === stepIdx
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border text-muted-foreground hover:bg-accent/30"
            }`}
          >
            {s.command.split(" ")[0] === "make"
              ? s.command.split(" ")[1]
              : s.command.split(" ")[0]}
          </button>
        ))}
      </div>

      {/* Terminal */}
      <div className="rounded-lg overflow-hidden border border-border">
        {/* Terminal title bar — three colored dots */}
        <div className="flex items-center gap-2 px-3 py-2 bg-background/60 border-b border-border">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-status-unhealthy" />
            <span className="w-2.5 h-2.5 rounded-full bg-status-degraded" />
            <span className="w-2.5 h-2.5 rounded-full bg-status-healthy" />
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2">
            dev@atlasops: ~/infra-monitor
          </span>
        </div>

        {/* Terminal body */}
        <div
          ref={terminalRef}
          className="terminal p-4 h-[400px] overflow-y-auto atlas-scroll"
        >
          <div className="mb-2 text-xs opacity-60">
            # {step.description}
          </div>
          {showCommand && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3"
            >
              <span className="terminal-prompt" />
              <span className="text-status-healthy font-semibold">$ </span>
              <span>{step.command}</span>
              <span className="terminal-cursor" />
            </motion.div>
          )}
          <div className="space-y-0.5">
            {step.output.slice(0, visibleLines).map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-pre-wrap"
              >
                {line.startsWith("[✓]") ? (
                  <span className="text-status-healthy">{line}</span>
                ) : line.startsWith("[!]") ? (
                  <span className="text-status-degraded">{line}</span>
                ) : line.startsWith("[✗]") ? (
                  <span className="text-status-unhealthy">{line}</span>
                ) : line.startsWith("[+]") ? (
                  <span className="text-status-healthy">{line}</span>
                ) : line.startsWith("[deploy]") || line.startsWith("[backup]") || line.startsWith("[check]") ? (
                  <span className="text-blue-300">{line}</span>
                ) : (
                  <span>{line}</span>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Current command explanation */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono text-muted-foreground">
            step {stepIdx + 1} / {MOCK_CLI_DEMO.length}
          </span>
        </div>
        <div className="font-mono text-sm mb-2">{step.command}</div>
        <p className="text-sm text-muted-foreground">{step.description}</p>
      </div>
    </div>
  );
}
