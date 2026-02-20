import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { key: "create", label: "Create" },
  { key: "discover", label: "Discover" },
  { key: "map", label: "Map" },
  { key: "preview", label: "Preview" },
  { key: "import", label: "Import" },
] as const;

const STATUS_TO_STEP: Record<string, number> = {
  pending: 0,
  discovered: 1,
  mapped: 2,
  importing: 3,
  completed: 4,
  completed_with_errors: 4,
  failed: 4,
};

interface StepIndicatorProps {
  status: string;
}

function StepIndicator({ status }: StepIndicatorProps) {
  const currentStep = STATUS_TO_STEP[status] ?? 0;

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;

        return (
          <div key={step.key} className="flex items-center gap-2">
            {index > 0 && (
              <div
                className={cn(
                  "h-px w-6",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex size-5 items-center justify-center text-[10px] font-medium",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary/20 text-primary ring-1 ring-primary",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckIcon className="size-3" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-xs",
                  isCurrent
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { StepIndicator };
