import { NotFoundError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type { VersionDiffData } from "../../domain/value-objects/VersionDiff";
import type { DatasetVersionRepository } from "../ports/DatasetVersionRepository";

export class ComputeVersionDiff {
  constructor(private readonly repo: DatasetVersionRepository) {}

  async execute(versionAId: UUID, versionBId: UUID): Promise<VersionDiffData> {
    const [versionA, versionB] = await Promise.all([
      this.repo.findById(versionAId),
      this.repo.findById(versionBId),
    ]);

    if (!versionA) {
      throw new NotFoundError("DatasetVersion", versionAId);
    }
    if (!versionB) {
      throw new NotFoundError("DatasetVersion", versionBId);
    }

    const idsA = new Set(versionA.candidateIds as string[]);
    const idsB = new Set(versionB.candidateIds as string[]);

    const added = [...idsA].filter((id) => !idsB.has(id));
    const removed = [...idsB].filter((id) => !idsA.has(id));
    const unchanged = [...idsA].filter((id) => idsB.has(id));

    // Build scenario breakdown from lineage if available
    const scenarioBreakdown = {
      added: {} as Record<string, number>,
      removed: {} as Record<string, number>,
      changed: {} as Record<string, number>,
    };

    const buildCandidateScenarioMap = (
      lineage: unknown
    ): Map<string, string> => {
      const map = new Map<string, string>();
      if (lineage && typeof lineage === "object") {
        const l = lineage as {
          candidates?: Array<{
            candidate_id?: string;
            scenario_type_id?: string;
          }>;
        };
        if (l.candidates) {
          for (const c of l.candidates) {
            if (c.candidate_id && c.scenario_type_id) {
              map.set(c.candidate_id, c.scenario_type_id);
            }
          }
        }
      }
      return map;
    };

    const scenarioMapA = buildCandidateScenarioMap(versionA.lineage);
    const scenarioMapB = buildCandidateScenarioMap(versionB.lineage);

    for (const id of added) {
      const scenario = scenarioMapA.get(id) ?? "unknown";
      scenarioBreakdown.added[scenario] =
        (scenarioBreakdown.added[scenario] ?? 0) + 1;
    }

    for (const id of removed) {
      const scenario = scenarioMapB.get(id) ?? "unknown";
      scenarioBreakdown.removed[scenario] =
        (scenarioBreakdown.removed[scenario] ?? 0) + 1;
    }

    // changed detection requires label hashes — leave empty for now
    const changed: Array<{
      candidateId: string;
      previousLabelHash: string;
      currentLabelHash: string;
    }> = [];

    return {
      version_a: {
        id: versionA.id,
        version: versionA.version,
        suite_id: versionA.suiteId,
      },
      version_b: {
        id: versionB.id,
        version: versionB.version,
        suite_id: versionB.suiteId,
      },
      added_count: added.length,
      removed_count: removed.length,
      unchanged_count: unchanged.length,
      changed_count: changed.length,
      net_delta: added.length - removed.length,
      added_candidate_ids: added,
      removed_candidate_ids: removed,
      changed,
      scenario_breakdown: scenarioBreakdown,
    };
  }
}
