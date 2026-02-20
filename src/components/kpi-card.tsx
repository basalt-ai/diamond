import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  description?: React.ReactNode;
  className?: string;
}

function KpiCard({
  label,
  value,
  icon: Icon,
  description,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex-row items-center gap-2">
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
        <span className="text-xs text-muted-foreground">{label}</span>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export { KpiCard };
export type { KpiCardProps };
