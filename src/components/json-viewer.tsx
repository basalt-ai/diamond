"use client";

import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface JsonViewerProps {
  data: unknown;
  defaultExpanded?: boolean;
}

function JsonPrimitive({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="font-mono text-muted-foreground">null</span>;
  }

  if (typeof value === "boolean") {
    return (
      <span className="font-mono text-primary">{value ? "true" : "false"}</span>
    );
  }

  if (typeof value === "number") {
    return <span className="font-mono text-chart-1">{value}</span>;
  }

  return (
    <span className="font-mono text-chart-2">&quot;{String(value)}&quot;</span>
  );
}

function JsonNode({
  label,
  data,
  defaultExpanded,
}: {
  label: string;
  data: unknown;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (data === null || data === undefined || typeof data !== "object") {
    return (
      <div className="flex items-baseline gap-1.5 py-0.5">
        <span className="font-mono text-xs text-foreground">{label}:</span>
        <JsonPrimitive value={data} />
      </div>
    );
  }

  const entries = Array.isArray(data)
    ? data.map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>);

  const bracketOpen = Array.isArray(data) ? "[" : "{";
  const bracketClose = Array.isArray(data) ? "]" : "}";

  return (
    <div className="py-0.5">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex items-center gap-0.5 text-xs hover:text-primary"
      >
        <ChevronRightIcon
          className={cn(
            "size-3.5 shrink-0 transition-transform",
            expanded && "rotate-90"
          )}
        />
        <span className="font-mono text-foreground">{label}</span>
        <span className="font-mono text-muted-foreground">
          {bracketOpen}
          {expanded ? "" : `${entries.length} items${bracketClose}`}
        </span>
      </button>
      {expanded ? (
        <div className="pl-4">
          {entries.map(([key, value]) => (
            <JsonNode
              key={key}
              label={key}
              data={value}
              defaultExpanded={defaultExpanded}
            />
          ))}
          <span className="font-mono text-xs text-muted-foreground">
            {bracketClose}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function JsonViewer({ data, defaultExpanded = false }: JsonViewerProps) {
  if (data === null || data === undefined || typeof data !== "object") {
    return (
      <div className="text-xs">
        <JsonPrimitive value={data} />
      </div>
    );
  }

  const entries = Array.isArray(data)
    ? data.map((v, i) => [String(i), v] as const)
    : Object.entries(data as Record<string, unknown>);

  return (
    <div className="text-xs">
      {entries.map(([key, value]) => (
        <JsonNode
          key={key}
          label={key}
          data={value}
          defaultExpanded={defaultExpanded}
        />
      ))}
    </div>
  );
}

export { JsonViewer };
export type { JsonViewerProps };
