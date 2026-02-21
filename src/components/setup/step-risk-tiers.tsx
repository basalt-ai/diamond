"use client";

import { ArrowLeftIcon, ArrowRightIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";

import type { StepProps } from "./types";

interface RiskTier {
  id: string;
  name: string;
  weight: number;
  category: string;
}

export function StepRiskTiers({
  onNext,
  onBack,
  onReadinessChange,
}: StepProps) {
  const { data, isLoading, refetch } =
    useApi<PaginatedResponse<RiskTier>>("/risk-tiers");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("0.5");
  const [category, setCategory] = useState("business");

  const { mutate: createTier, isPending: isCreating } = useMutation(
    "POST",
    "/risk-tiers",
    {
      onSuccess: () => {
        toast.success("Risk tier created");
        setName("");
        setWeight("0.5");
        setShowForm(false);
        refetch();
        onReadinessChange();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  const [isSeeding, setIsSeeding] = useState(false);

  async function handleUseDefaults() {
    setIsSeeding(true);
    try {
      const defaults = [
        { name: "critical", weight: 1.0, category: "safety" },
        { name: "high", weight: 0.75, category: "compliance" },
        { name: "medium", weight: 0.5, category: "business" },
        { name: "low", weight: 0.25, category: "business" },
      ];
      for (const tier of defaults) {
        try {
          await fetch("/api/v1/risk-tiers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(tier),
          });
        } catch {
          // ignore duplicates
        }
      }
      toast.success("Default risk tiers created");
      refetch();
      onReadinessChange();
    } finally {
      setIsSeeding(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createTier({ name, weight: Number(weight), category });
  }

  const tiers = data?.data ?? [];
  const canProceed = tiers.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Tiers</CardTitle>
        <CardDescription>
          Define at least one risk tier. Risk tiers categorize the severity of
          scenario types.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : tiers.length > 0 ? (
          <div className="space-y-2">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span className="text-sm font-medium">{tier.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{tier.category}</Badge>
                  <span className="text-xs text-muted-foreground">
                    weight: {tier.weight}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No risk tiers yet. Create one or use the defaults.
          </p>
        )}

        {!showForm && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(true)}
            >
              <PlusIcon className="mr-1 size-3" />
              Add Custom
            </Button>
            {tiers.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUseDefaults}
                disabled={isSeeding}
              >
                {isSeeding ? "Creating..." : "Use Defaults (4 tiers)"}
              </Button>
            )}
          </div>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-md border p-3"
          >
            <Field>
              <Label htmlFor="rt-name">Name</Label>
              <Input
                id="rt-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. critical"
                required
              />
            </Field>
            <div className="flex gap-3">
              <Field className="flex-1">
                <Label htmlFor="rt-weight">Weight (0-1)</Label>
                <Input
                  id="rt-weight"
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                />
              </Field>
              <Field className="flex-1">
                <Label htmlFor="rt-cat">Category</Label>
                <select
                  id="rt-cat"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                >
                  <option value="business">business</option>
                  <option value="safety">safety</option>
                  <option value="compliance">compliance</option>
                </select>
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isCreating}>
                {isCreating ? "Creating..." : "Add"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon className="mr-2 size-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Next
          <ArrowRightIcon className="ml-2 size-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}
