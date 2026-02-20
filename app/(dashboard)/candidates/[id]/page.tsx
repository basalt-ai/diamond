"use client";

import { ArrowLeftIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { JsonViewer } from "@/components/json-viewer";
import { StateBadge } from "@/components/state-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";
import { useMutation } from "@/hooks/use-mutation";

interface Candidate {
  id: string;
  episodeId: string;
  scenarioTypeId: string | null;
  state: "raw" | "scored" | "selected" | "labeled" | "validated" | "released";
  mappingConfidence: number;
  scores: Record<string, unknown>;
  features: Record<string, unknown>;
  selectionRunId: string | null;
  createdAt: string;
  updatedAt: string;
}

const VALID_TRANSITIONS: Record<string, { action: string; label: string }[]> = {
  raw: [{ action: "scored", label: "Score" }],
  scored: [{ action: "selected", label: "Select" }],
  selected: [{ action: "labeled", label: "Label" }],
  labeled: [{ action: "validated", label: "Validate" }],
  validated: [{ action: "released", label: "Release" }],
  released: [],
};

function truncateId(id: string): string {
  return id.slice(0, 8) + "\u2026";
}

function InfoRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}

export default function CandidateDetailPage() {
  const params = useParams<{ id: string }>();
  const candidateId = params.id;

  const {
    data: candidate,
    isLoading,
    refetch,
  } = useApi<Candidate>(`/candidates/${candidateId}`);

  const [confirmAction, setConfirmAction] = useState<{
    action: string;
    label: string;
  } | null>(null);

  const { mutate, isPending } = useMutation<Candidate>(
    "PATCH",
    `/candidates/${candidateId}/state`,
    {
      onSuccess: () => {
        toast.success("State transition successful");
        setConfirmAction(null);
        refetch();
      },
      onError: (error) => {
        toast.error(error.message);
        setConfirmAction(null);
      },
    }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="space-y-4">
        <Link
          href="/candidates"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Candidates
        </Link>
        <p className="text-sm text-muted-foreground">Candidate not found.</p>
      </div>
    );
  }

  const transitions = VALID_TRANSITIONS[candidate.state] ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/candidates"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Candidates
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold font-mono">
              {truncateId(candidate.id)}
            </h1>
            <StateBadge state={candidate.state} className="text-sm" />
          </div>
          <p className="text-xs text-muted-foreground">
            Created {new Date(candidate.createdAt).toLocaleDateString()}
            {" \u00b7 "}
            Updated {new Date(candidate.updatedAt).toLocaleDateString()}
          </p>
        </div>

        {transitions.length > 0 ? (
          <div className="flex items-center gap-2">
            {transitions.map((t) => (
              <Button
                key={t.action}
                onClick={() => setConfirmAction(t)}
                disabled={isPending}
              >
                {t.label}
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      <Separator />

      {/* Info Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <InfoRow label="Episode ID">
              <Link
                href={`/episodes/${candidate.episodeId}`}
                className="text-primary hover:underline font-mono"
              >
                {truncateId(candidate.episodeId)}
              </Link>
            </InfoRow>
            <InfoRow label="Scenario Type ID">
              {candidate.scenarioTypeId
                ? truncateId(candidate.scenarioTypeId)
                : "\u2014"}
            </InfoRow>
            <InfoRow label="Mapping Confidence">
              {candidate.mappingConfidence.toFixed(2)}
            </InfoRow>
            <InfoRow label="Selection Run ID">
              {candidate.selectionRunId
                ? truncateId(candidate.selectionRunId)
                : "\u2014"}
            </InfoRow>
          </div>
        </CardContent>
      </Card>

      {/* Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Scores</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(candidate.scores).length > 0 ? (
            <JsonViewer data={candidate.scores} defaultExpanded />
          ) : (
            <p className="text-sm text-muted-foreground">No scores recorded.</p>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Features</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(candidate.features).length > 0 ? (
            <JsonViewer data={candidate.features} defaultExpanded />
          ) : (
            <p className="text-sm text-muted-foreground">
              No features recorded.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={`${confirmAction?.label ?? ""} Candidate`}
        description={`Are you sure you want to transition this candidate to the "${confirmAction?.action ?? ""}" state? This action cannot be undone.`}
        confirmLabel={confirmAction?.label ?? "Confirm"}
        onConfirm={() => {
          if (confirmAction) {
            mutate({ target_state: confirmAction.action });
          }
        }}
      />
    </div>
  );
}
