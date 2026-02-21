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
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";

import type { StepProps } from "./types";

interface RiskTier {
  id: string;
  name: string;
}

interface ScenarioType {
  id: string;
  name: string;
  description: string;
  riskTierId: string;
}

export function StepScenarioType({
  onNext,
  onBack,
  onReadinessChange,
}: StepProps) {
  const {
    data: typesData,
    isLoading,
    refetch,
  } = useApi<PaginatedResponse<ScenarioType>>("/scenario-types?page_size=100");

  const { data: tiersData } =
    useApi<PaginatedResponse<RiskTier>>("/risk-tiers");

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [riskTierId, setRiskTierId] = useState("");

  const { mutate: createType, isPending: isCreating } = useMutation(
    "POST",
    "/scenario-types",
    {
      onSuccess: () => {
        toast.success("Scenario type created");
        setName("");
        setDescription("");
        setShowForm(false);
        refetch();
        onReadinessChange();
      },
      onError: (err) => toast.error(err.message),
    }
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!riskTierId) {
      toast.error("Please select a risk tier");
      return;
    }
    createType({ name, description, riskTierId });
  }

  const types = typesData?.data ?? [];
  const tiers = tiersData?.data ?? [];
  const canProceed = types.length > 0;

  // Auto-select first risk tier when available
  if (tiers.length > 0 && !riskTierId && tiers[0]) {
    setRiskTierId(tiers[0].id);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scenario Types</CardTitle>
        <CardDescription>
          Create at least one scenario type. These are the categories of AI
          behavior Diamond will evaluate.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : types.length > 0 ? (
          <div className="space-y-2">
            {types.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div>
                  <span className="text-sm font-medium">{type.name}</span>
                  {type.description && (
                    <p className="text-xs text-muted-foreground">
                      {type.description}
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  {tiers.find((t) => t.id === type.riskTierId)?.name ??
                    "unknown"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No scenario types yet. You must create at least one to proceed.
          </p>
        )}

        {!showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <PlusIcon className="mr-1 size-3" />
            Add Scenario Type
          </Button>
        )}

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 rounded-md border p-3"
          >
            <Field>
              <Label htmlFor="st-name">Name</Label>
              <Input
                id="st-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. customer_support_refusal"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="st-desc">Description</Label>
              <Textarea
                id="st-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this scenario type..."
              />
            </Field>
            <Field>
              <Label htmlFor="st-tier">Risk Tier</Label>
              <select
                id="st-tier"
                value={riskTierId}
                onChange={(e) => setRiskTierId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                required
              >
                <option value="">Select a risk tier...</option>
                {tiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}
                  </option>
                ))}
              </select>
            </Field>
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
