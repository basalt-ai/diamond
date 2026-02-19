import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const stateColorMap: Record<string, string> = {
  // Initial/pending
  raw: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  // Active/in-progress
  scored: "bg-primary/20 text-primary",
  selected: "bg-primary/20 text-primary",
  in_progress: "bg-primary/20 text-primary",
  review: "bg-primary/20 text-primary",
  adjudication: "bg-chart-4/20 text-chart-4",
  validating: "bg-primary/20 text-primary",
  processing: "bg-primary/20 text-primary",
  // Success/terminal
  labeled: "bg-chart-1/20 text-chart-1",
  validated: "bg-chart-1/20 text-chart-1",
  released: "bg-chart-1/20 text-chart-1",
  finalized: "bg-chart-1/20 text-chart-1",
  completed: "bg-chart-1/20 text-chart-1",
  // Negative/error
  cancelled: "bg-destructive/20 text-destructive",
  failed: "bg-destructive/20 text-destructive",
  deprecated: "bg-destructive/20 text-destructive",
};

function formatState(state: string): string {
  return state.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StateBadgeProps {
  state: string;
  className?: string;
}

function StateBadge({ state, className }: StateBadgeProps) {
  const colorClasses = stateColorMap[state] ?? "bg-muted text-muted-foreground";

  return (
    <Badge
      variant="secondary"
      className={cn("border-none", colorClasses, className)}
    >
      {formatState(state)}
    </Badge>
  );
}

export { StateBadge };
export type { StateBadgeProps };
