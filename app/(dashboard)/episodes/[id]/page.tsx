"use client";

import {
  ArrowLeftIcon,
  AlertTriangleIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { JsonViewer } from "@/components/json-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Episode {
  id: string;
  source: string;
  sourceTraceId: string;
  ingestedAt: string;
  occurredAt: string | null;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  trace: Record<string, unknown>;
  outcomes: Record<string, unknown>;
  modelVersion: string | null;
  locale: string | null;
  planTier: string | null;
  device: string | null;
  scenarioTypeId: string | null;
  hasNegativeFeedback: boolean;
  metadata: Record<string, unknown>;
  piiRedactionCount: number;
}

// ---------------------------------------------------------------------------
// Detail field component
// ---------------------------------------------------------------------------

interface DetailFieldProps {
  label: string;
  value: React.ReactNode;
}

function DetailField({ label, value }: DetailFieldProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "-"}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function EpisodeDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-7 w-64" />
      </div>
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EpisodeDetailPage() {
  const params = useParams<{ id: string }>();
  const {
    data: episode,
    isLoading,
    error,
  } = useApi<Episode>(`/episodes/${params.id}`);

  if (isLoading) {
    return <EpisodeDetailSkeleton />;
  }

  if (error || !episode) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/episodes">
            <ArrowLeftIcon className="mr-2 size-4" />
            Back to Episodes
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {error?.message ?? "Episode not found."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/episodes">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to Episodes</span>
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{episode.source}</h1>
            {episode.hasNegativeFeedback ? (
              <Badge variant="destructive">
                <AlertTriangleIcon className="mr-1 size-3" />
                Negative Feedback
              </Badge>
            ) : null}
            {episode.piiRedactionCount > 0 ? (
              <Badge variant="secondary">
                <ShieldCheckIcon className="mr-1 size-3" />
                {episode.piiRedactionCount} PII Redaction
                {episode.piiRedactionCount !== 1 ? "s" : ""}
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {episode.modelVersion
              ? `Model: ${episode.modelVersion}`
              : "No model version"}
            {" | "}
            Ingested {new Date(episode.ingestedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="outputs">Outputs</TabsTrigger>
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Episode Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
                <DetailField label="ID" value={episode.id} />
                <DetailField label="Source" value={episode.source} />
                <DetailField
                  label="Source Trace ID"
                  value={episode.sourceTraceId}
                />
                <DetailField
                  label="Model Version"
                  value={episode.modelVersion ?? "-"}
                />
                <DetailField
                  label="Ingested At"
                  value={new Date(episode.ingestedAt).toLocaleDateString()}
                />
                <DetailField
                  label="Occurred At"
                  value={
                    episode.occurredAt
                      ? new Date(episode.occurredAt).toLocaleDateString()
                      : "-"
                  }
                />
                <DetailField label="Locale" value={episode.locale ?? "-"} />
                <DetailField
                  label="Plan Tier"
                  value={episode.planTier ?? "-"}
                />
                <DetailField label="Device" value={episode.device ?? "-"} />
                <DetailField
                  label="Scenario Type ID"
                  value={episode.scenarioTypeId ?? "-"}
                />
                <DetailField
                  label="Negative Feedback"
                  value={episode.hasNegativeFeedback ? "Yes" : "No"}
                />
                <DetailField
                  label="PII Redactions"
                  value={episode.piiRedactionCount}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inputs Tab */}
        <TabsContent value="inputs">
          <Card>
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer data={episode.inputs} defaultExpanded />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outputs Tab */}
        <TabsContent value="outputs">
          <Card>
            <CardHeader>
              <CardTitle>Outputs</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer data={episode.outputs} defaultExpanded />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trace Tab */}
        <TabsContent value="trace">
          <Card>
            <CardHeader>
              <CardTitle>Trace</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer data={episode.trace} defaultExpanded />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Outcomes Tab */}
        <TabsContent value="outcomes">
          <Card>
            <CardHeader>
              <CardTitle>Outcomes</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer data={episode.outcomes} defaultExpanded />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Metadata Tab */}
        <TabsContent value="metadata">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent>
              <JsonViewer data={episode.metadata} defaultExpanded />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
