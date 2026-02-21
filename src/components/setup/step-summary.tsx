"use client";

import { ArrowLeftIcon, CheckCircle2Icon, CircleAlertIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { ReadinessData } from "./types";

interface StepSummaryProps {
  readiness: ReadinessData | null;
  onBack: () => void;
  onComplete: () => Promise<void>;
}

export function StepSummary({
  readiness,
  onBack,
  onComplete,
}: StepSummaryProps) {
  const [isCompleting, setIsCompleting] = useState(false);

  async function handleComplete() {
    setIsCompleting(true);
    try {
      await onComplete();
    } finally {
      setIsCompleting(false);
    }
  }

  const items = [
    {
      label: "Risk Tiers",
      count: readiness?.counts.riskTiers ?? 0,
      required: true,
    },
    {
      label: "Failure Modes",
      count: readiness?.counts.failureModes ?? 0,
      required: false,
    },
    {
      label: "Scenario Types",
      count: readiness?.counts.scenarioTypes ?? 0,
      required: true,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Summary</CardTitle>
        <CardDescription>
          Review your configuration before completing setup.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded-md border px-3 py-2"
          >
            <div className="flex items-center gap-2">
              {item.count > 0 ? (
                <CheckCircle2Icon className="size-4 text-green-500" />
              ) : item.required ? (
                <CircleAlertIcon className="size-4 text-destructive" />
              ) : (
                <CircleAlertIcon className="size-4 text-muted-foreground" />
              )}
              <span className="text-sm">{item.label}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {item.count} created
            </span>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon className="mr-2 size-4" />
          Back
        </Button>
        <Button onClick={handleComplete} disabled={isCompleting}>
          {isCompleting ? "Completing..." : "Complete Setup"}
        </Button>
      </CardFooter>
    </Card>
  );
}
