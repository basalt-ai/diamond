"use client";

import { ArrowLeftIcon, BookOpenIcon } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { DataTable, type ColumnDef } from "@/components/data-table/data-table";
import { EmptyState } from "@/components/empty-state";
import { JsonViewer } from "@/components/json-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi } from "@/hooks/use-api";

interface ScenarioType {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

interface Rubric {
  id: string;
  name: string;
  description: string;
  version: number;
  createdAt: string;
}

const rubricColumns: ColumnDef<Rubric>[] = [
  {
    id: "name",
    header: "Name",
    accessorFn: (row) => row.name,
    sortable: true,
  },
  {
    id: "description",
    header: "Description",
    accessorFn: (row) => row.description,
    className: "max-w-xs truncate",
  },
  {
    id: "version",
    header: "Version",
    accessorFn: (row) => <Badge variant="secondary">v{row.version}</Badge>,
  },
  {
    id: "created",
    header: "Created",
    accessorFn: (row) => new Date(row.createdAt).toLocaleDateString(),
    sortable: true,
  },
];

export default function ScenarioTypeDetailPage() {
  const params = useParams<{ id: string }>();

  const { data: scenarioType, isLoading } = useApi<ScenarioType>(
    `/scenario-types/${params.id}`
  );

  const { data: rubrics, isLoading: rubricsLoading } = useApi<Rubric[]>(
    `/scenario-types/${params.id}/effective-rubrics`
  );

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!scenarioType) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Scenario type not found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon-sm" asChild>
          <Link href="/scenarios">
            <ArrowLeftIcon className="size-4" />
            <span className="sr-only">Back to scenarios</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{scenarioType.name}</h1>
          <p className="text-xs text-muted-foreground">
            {scenarioType.description}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono">{scenarioType.id}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Parent</span>
              <span>{scenarioType.parentId ?? "None (root)"}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>
                {new Date(scenarioType.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Updated</span>
              <span>
                {new Date(scenarioType.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metadata</CardTitle>
            <CardDescription>
              Custom metadata associated with this type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scenarioType.metadata &&
            Object.keys(scenarioType.metadata).length > 0 ? (
              <JsonViewer data={scenarioType.metadata} defaultExpanded />
            ) : (
              <p className="text-xs text-muted-foreground">No metadata</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold">Effective Rubrics</h2>
        <DataTable
          columns={rubricColumns}
          data={rubrics ?? []}
          isLoading={rubricsLoading}
          emptyState={
            <EmptyState
              icon={BookOpenIcon}
              title="No rubrics"
              description="No rubrics are linked to this scenario type yet."
            />
          }
        />
      </div>
    </div>
  );
}
