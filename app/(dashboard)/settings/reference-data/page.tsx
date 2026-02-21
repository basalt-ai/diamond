"use client";

import { PlusIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";
import type { PaginatedResponse } from "@/lib/api-client";

interface RiskTier {
  id: string;
  name: string;
  weight: number;
  category: string;
}

interface FailureMode {
  id: string;
  name: string;
  description: string;
  severity: string;
}

function RiskTiersTab() {
  const { data, isLoading, refetch } = useApi<RiskTier[]>("/risk-tiers");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("0.5");
  const [category, setCategory] = useState("business");

  const { mutate, isPending } = useMutation("POST", "/risk-tiers", {
    onSuccess: () => {
      toast.success("Risk tier created");
      setName("");
      setWeight("0.5");
      setShowForm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const tiers = data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Risk Tiers</CardTitle>
        <CardDescription>
          Manage risk tiers used for scenario type classification.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          tiers.map((tier) => (
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
          ))
        )}

        {!showForm ? (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <PlusIcon className="mr-1 size-3" />
            Add Risk Tier
          </Button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutate({ name, weight: Number(weight), category });
            }}
            className="space-y-3 rounded-md border p-3"
          >
            <Field>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. critical"
                required
              />
            </Field>
            <div className="flex gap-3">
              <Field className="flex-1">
                <Label>Weight (0-1)</Label>
                <Input
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
                <Label>Category</Label>
                <select
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
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Creating..." : "Add"}
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
    </Card>
  );
}

function FailureModesTab() {
  const { data, isLoading, refetch } =
    useApi<PaginatedResponse<FailureMode>>("/failure-modes");
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("medium");

  const { mutate, isPending } = useMutation("POST", "/failure-modes", {
    onSuccess: () => {
      toast.success("Failure mode created");
      setName("");
      setDescription("");
      setShowForm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const modes = data?.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Failure Modes</CardTitle>
        <CardDescription>
          Manage failure modes that describe common AI system failures.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          modes.map((mode) => (
            <div
              key={mode.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div>
                <span className="text-sm font-medium">{mode.name}</span>
                {mode.description && (
                  <p className="text-xs text-muted-foreground">
                    {mode.description}
                  </p>
                )}
              </div>
              <Badge variant="secondary">{mode.severity}</Badge>
            </div>
          ))
        )}

        {!showForm ? (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <PlusIcon className="mr-1 size-3" />
            Add Failure Mode
          </Button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutate({ name, description, severity });
            }}
            className="space-y-3 rounded-md border p-3"
          >
            <Field>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. hallucination"
                required
              />
            </Field>
            <Field>
              <Label>Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this failure mode..."
              />
            </Field>
            <Field>
              <Label>Severity</Label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </Field>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Creating..." : "Add"}
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
    </Card>
  );
}

function ReferenceDataContent() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Reference Data</h1>
        <p className="text-xs text-muted-foreground">
          Manage the reference data used by Diamond's intelligence pipeline.
        </p>
      </div>

      <Tabs defaultValue="risk_tiers">
        <TabsList>
          <TabsTrigger value="risk_tiers">Risk Tiers</TabsTrigger>
          <TabsTrigger value="failure_modes">Failure Modes</TabsTrigger>
        </TabsList>
        <TabsContent value="risk_tiers">
          <RiskTiersTab />
        </TabsContent>
        <TabsContent value="failure_modes">
          <FailureModesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function ReferenceDataPage() {
  return (
    <Suspense>
      <ReferenceDataContent />
    </Suspense>
  );
}
