"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  BookOpen,
  Boxes,
  Code2,
  Github,
  Heart,
  Server,
  Terminal,
  TriangleAlert,
  Wifi,
  WifiOff,
} from "lucide-react";
import { DashboardSection } from "@/components/sections/dashboard-section";
import { ArchitectureSection } from "@/components/sections/architecture-section";
import { ServicesSection } from "@/components/sections/services-section";
import { IncidentsSection } from "@/components/sections/incidents-section";
import { RunbookSection } from "@/components/sections/runbook-section";
import { ApiSection } from "@/components/sections/api-section";
import { CliSection } from "@/components/sections/cli-section";
import { pingApi } from "@/lib/api";
import type { SectionId } from "@/lib/types";

/** Navigation config: single source of truth for sidebar and mobile menu. */
const NAV: { id: SectionId; label: string; icon: React.ReactNode; hint: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: <Activity className="w-4 h-4" />, hint: "KPIs, metrics, active incidents" },
  { id: "architecture", label: "Architecture", icon: <Boxes className="w-4 h-4" />, hint: "Interactive service diagram" },
  { id: "services", label: "Services", icon: <Server className="w-4 h-4" />, hint: "Registry of all services" },
  { id: "incidents", label: "Incidents", icon: <TriangleAlert className="w-4 h-4" />, hint: "Incident timeline" },
  { id: "runbook", label: "Runbook", icon: <BookOpen className="w-4 h-4" />, hint: "Operational procedures" },
  { id: "api", label: "API", icon: <Code2 className="w-4 h-4" />, hint: "Endpoints + curl" },
  { id: "cli", label: "CLI", icon: <Terminal className="w-4 h-4" />, hint: "Terminal demo" },
];

export default function Home() {
  const [section, setSection] = useState<SectionId>("dashboard");
  const [apiLive, setApiLive] = useState<boolean | null>(null);

  // On page load, check API availability for the header indicator.
  useEffect(() => {
    pingApi().then(setApiLive);
    // And recheck every 30s — if someone brings up docker-compose,
    // the indicator switches from "demo" to "live".
    const t = setInterval(() => {
      pingApi().then(setApiLive);
    }, 30000);
    return () => clearInterval(t);
  }, []);

  const currentNav = NAV.find((n) => n.id === section);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 lg:px-6 h-14">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-gradient-to-br from-status-healthy/30 to-status-healthy/5 border border-status-healthy/30 flex items-center justify-center font-mono text-xs font-bold text-status-healthy">
                A
              </div>
              <span className="font-mono font-semibold text-sm">
                AtlasOps
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline">
                · infra-monitor
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* live/demo indicator */}
            <div className="flex items-center gap-1.5 text-xs">
              {apiLive === null ? (
                <span className="text-muted-foreground">checking...</span>
              ) : apiLive ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-status-healthy" />
                  <span className="text-status-healthy font-mono">live</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-status-degraded" />
                  <span className="text-status-degraded font-mono">demo</span>
                </>
              )}
            </div>

            {/* GitHub link */}
            <a
              href="https://github.com/imronaxl/atlasops"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-4 h-4" />
              <span className="hidden sm:inline">GitHub</span>
            </a>
          </div>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex-1 flex">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-60 border-r border-border bg-card/30 shrink-0">
          <nav className="p-3 space-y-1">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors ${
                  section === item.id
                    ? "bg-primary/15 text-foreground border border-primary/30"
                    : "text-muted-foreground hover:bg-accent/30 hover:text-foreground border border-transparent"
                }`}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Current section hint */}
          <div className="mt-auto p-3 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <div className="font-mono mb-1 text-foreground">{currentNav?.label}</div>
              {currentNav?.hint}
            </div>
          </div>

          {/* Footer tag */}
          <div className="p-3 border-t border-border">
            <div className="text-[10px] text-muted-foreground font-mono">
              v1.0.0 · FastAPI · Next.js
            </div>
          </div>
        </aside>

        {/* Mobile horizontal nav */}
        <div className="lg:hidden flex border-b border-border overflow-x-auto atlas-scroll bg-card/30">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors ${
                section === item.id
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {section === "dashboard" && <DashboardSection />}
              {section === "architecture" && <ArchitectureSection />}
              {section === "services" && <ServicesSection />}
              {section === "incidents" && <IncidentsSection />}
              {section === "runbook" && <RunbookSection />}
              {section === "api" && <ApiSection />}
              {section === "cli" && <CliSection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 lg:px-6 py-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-mono">AtlasOps</span>
            <span>·</span>
            <span>Infrastructure monitoring</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Portfolio project</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span>built with</span>
            <Heart className="w-3 h-3 text-status-unhealthy" />
            <span>FastAPI + Next.js</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
