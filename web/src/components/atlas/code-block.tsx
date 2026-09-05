"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/format";

/** Code/command block with a copy button. */
export function CodeBlock({
  code,
  language = "bash",
  className,
  showCopy = true,
}: {
  code: string;
  language?: string;
  className?: string;
  showCopy?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className={cn("relative group", className)}>
      <pre className="terminal p-3 pr-12 overflow-x-auto atlas-scroll text-xs">
        <code data-language={language}>{code}</code>
      </pre>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Copy"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-status-healthy" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}
