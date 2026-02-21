"use client";

import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Diamond Engine</CardTitle>
        <CardDescription>
          Let's set up the reference data your intelligence pipeline needs to
          operate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Diamond evaluates AI system behavior by classifying episodes into{" "}
          <strong className="text-foreground">scenario types</strong>, each
          associated with a{" "}
          <strong className="text-foreground">risk tier</strong> and optional{" "}
          <strong className="text-foreground">failure modes</strong>.
        </p>
        <p>This wizard will walk you through creating:</p>
        <ol className="list-inside list-decimal space-y-1">
          <li>
            <strong className="text-foreground">Risk Tiers</strong> — severity
            levels (e.g. critical, high, medium, low)
          </li>
          <li>
            <strong className="text-foreground">Failure Modes</strong> — common
            ways AI systems fail (e.g. hallucination, refusal error)
          </li>
          <li>
            <strong className="text-foreground">Scenario Types</strong> — the
            categories of behavior you want to evaluate
          </li>
        </ol>
        <p>You can always modify this data later from Settings.</p>
      </CardContent>
      <CardFooter>
        <Button onClick={onNext} className="ml-auto">
          Get Started
          <ArrowRightIcon className="ml-2 size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
