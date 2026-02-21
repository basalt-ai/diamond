"use client";

import { CheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

import { StepFailureModes } from "./step-failure-modes";
import { StepRiskTiers } from "./step-risk-tiers";
import { StepScenarioType } from "./step-scenario-type";
import { StepSummary } from "./step-summary";
import { StepWelcome } from "./step-welcome";
import type { ReadinessData } from "./types";

const STEPS = [
  { key: "welcome", label: "Welcome" },
  { key: "risk_tiers", label: "Risk Tiers" },
  { key: "failure_modes", label: "Failure Modes" },
  { key: "scenario_type", label: "Scenario Type" },
  { key: "summary", label: "Summary" },
] as const;

type WizardStep = (typeof STEPS)[number]["key"];

export function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>("welcome");
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);

  const fetchReadiness = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/setup/readiness");
      const data = (await res.json()) as ReadinessData;
      setReadiness(data);
      if (data.ready) {
        router.replace("/");
      }
    } catch {
      // ignore — will retry on step navigation
    }
  }, [router]);

  useEffect(() => {
    fetchReadiness();
  }, [fetchReadiness]);

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  function goNext() {
    if (stepIndex < STEPS.length - 1) {
      const nextStep = STEPS[stepIndex + 1];
      if (nextStep) {
        setCurrentStep(nextStep.key);
        fetchReadiness();
      }
    }
  }

  function goBack() {
    if (stepIndex > 0) {
      const prevStep = STEPS[stepIndex - 1];
      if (prevStep) {
        setCurrentStep(prevStep.key);
      }
    }
  }

  async function handleComplete() {
    try {
      const res = await fetch("/api/v1/setup/complete", { method: "POST" });
      if (!res.ok) throw new Error("Failed to complete setup");
      toast.success("Setup complete!");
      router.replace("/");
    } catch {
      toast.error("Failed to complete setup. Please try again.");
    }
  }

  return (
    <div className="space-y-8">
      <StepIndicator steps={STEPS} currentIndex={stepIndex} />

      {currentStep === "welcome" && <StepWelcome onNext={goNext} />}
      {currentStep === "risk_tiers" && (
        <StepRiskTiers
          onNext={goNext}
          onBack={goBack}
          onReadinessChange={fetchReadiness}
        />
      )}
      {currentStep === "failure_modes" && (
        <StepFailureModes
          onNext={goNext}
          onBack={goBack}
          onReadinessChange={fetchReadiness}
        />
      )}
      {currentStep === "scenario_type" && (
        <StepScenarioType
          onNext={goNext}
          onBack={goBack}
          onReadinessChange={fetchReadiness}
        />
      )}
      {currentStep === "summary" && (
        <StepSummary
          readiness={readiness}
          onBack={goBack}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}

function StepIndicator({
  steps,
  currentIndex,
}: {
  steps: readonly { key: string; label: string }[];
  currentIndex: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

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
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-medium",
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
