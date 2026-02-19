import { count } from "drizzle-orm";

import { db } from "@/db";
import { cdCandidates } from "@/db/schema/candidate";
import { dsDatasetSuites, dsDatasetVersions } from "@/db/schema/dataset";
import { exExportJobs } from "@/db/schema/export";
import { igEpisodes } from "@/db/schema/ingestion";
import { lbLabelTasks } from "@/db/schema/labeling";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";

function toStateMap<const T extends readonly string[]>(
  states: T,
  rows: { state: string; count: number }[]
): Record<T[number], number> {
  const map = Object.fromEntries(states.map((s) => [s, 0])) as Record<
    T[number],
    number
  >;
  for (const row of rows) {
    if (row.state in map) {
      (map as Record<string, number>)[row.state] = row.count;
    }
  }
  return map;
}

export const GET = withApiMiddleware(async () => {
  const [
    episodeRows,
    candidateRows,
    labelTaskRows,
    suiteRows,
    versionRows,
    exportRows,
  ] = await Promise.all([
    db.select({ count: count() }).from(igEpisodes),
    db
      .select({ state: cdCandidates.state, count: count() })
      .from(cdCandidates)
      .groupBy(cdCandidates.state),
    db
      .select({ state: lbLabelTasks.state, count: count() })
      .from(lbLabelTasks)
      .groupBy(lbLabelTasks.state),
    db.select({ count: count() }).from(dsDatasetSuites),
    db
      .select({ state: dsDatasetVersions.state, count: count() })
      .from(dsDatasetVersions)
      .groupBy(dsDatasetVersions.state),
    db
      .select({ state: exExportJobs.state, count: count() })
      .from(exExportJobs)
      .groupBy(exExportJobs.state),
  ]);

  return ok({
    episodes: { total: episodeRows[0]?.count ?? 0 },
    candidates: toStateMap(
      ["raw", "scored", "selected", "labeled", "validated", "released"],
      candidateRows
    ),
    labelTasks: toStateMap(
      [
        "pending",
        "in_progress",
        "review",
        "adjudication",
        "finalized",
        "cancelled",
      ],
      labelTaskRows
    ),
    datasetSuites: { total: suiteRows[0]?.count ?? 0 },
    datasetVersions: toStateMap(
      ["draft", "validating", "released", "deprecated"],
      versionRows
    ),
    exports: toStateMap(
      ["pending", "processing", "completed", "failed"],
      exportRows
    ),
  });
});
