"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { JsonViewer } from "@/components/json-viewer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PreviewTableProps {
  sourceId: string;
}

type PreviewRow = Record<string, unknown>;

const PREVIEW_COLUMNS = [
  { key: "source", label: "source" },
  { key: "source_trace_id", label: "source_trace_id" },
  { key: "inputs", label: "inputs" },
  { key: "outputs", label: "outputs" },
  { key: "trace", label: "trace" },
  { key: "outcomes", label: "outcomes" },
  { key: "occurred_at", label: "occurred_at" },
  { key: "metadata", label: "metadata" },
] as const;

function PreviewTable({ sourceId }: PreviewTableProps) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limit, setLimit] = useState(5);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/v1/bulk-sources/${sourceId}/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(
            (body as { error?: { message?: string } } | null)?.error?.message ??
              "Preview failed"
          );
        }
        return res.json() as Promise<{ rows: PreviewRow[] }>;
      })
      .then((data) => setRows(data.rows))
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Preview failed");
      })
      .finally(() => setIsLoading(false));
  }, [sourceId, limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Preview</CardTitle>
        <CardDescription>
          Showing {rows.length} transformed row{rows.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No preview rows</p>
        ) : (
          <>
            <div className="space-y-4">
              {rows.map((row, i) => (
                <div
                  key={i}
                  className="border-border space-y-2 border-b pb-4 last:border-b-0"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    Row {i + 1}
                  </p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
                    {PREVIEW_COLUMNS.map((col) => (
                      <FieldRow
                        key={col.key}
                        label={col.label}
                        value={row[col.key]}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {limit < 20 && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLimit(20)}
                >
                  Show more rows
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <>
      <span className="font-mono text-muted-foreground">{label}</span>
      <div className="min-w-0">
        <CellValue value={value} />
      </div>
    </>
  );
}

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">{"\u2014"}</span>;
  }
  if (typeof value === "object") {
    return <JsonViewer data={value} />;
  }
  const str = String(value);
  return (
    <span className="break-all font-mono" title={str}>
      {str}
    </span>
  );
}

export { PreviewTable };
