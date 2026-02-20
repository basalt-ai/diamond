import { Loader2Icon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ImportProgressData {
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  deduplicated: number;
  startedAt: string | null;
  completedAt: string | null;
}

interface ImportProgressProps {
  progress: ImportProgressData;
}

function ImportProgress({ progress }: ImportProgressProps) {
  const percent =
    progress.total > 0
      ? Math.round((progress.processed / progress.total) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Loader2Icon className="size-4 animate-spin" />
          Importing...
        </CardTitle>
        <CardDescription>Auto-refreshing every 2 seconds</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percent} />
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>
            {progress.processed.toLocaleString()} of{" "}
            {progress.total.toLocaleString()} processed
          </span>
          <span className="text-chart-1">
            {progress.succeeded.toLocaleString()} succeeded
          </span>
          {progress.failed > 0 && (
            <span className="text-destructive">
              {progress.failed.toLocaleString()} failed
            </span>
          )}
          {progress.deduplicated > 0 && (
            <span className="text-muted-foreground">
              {progress.deduplicated.toLocaleString()} skipped
            </span>
          )}
        </div>
        {progress.startedAt && (
          <p className="text-xs text-muted-foreground">
            Started at {new Date(progress.startedAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export { ImportProgress };
