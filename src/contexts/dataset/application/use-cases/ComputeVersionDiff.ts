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
      added_candidate_ids: added,
      removed_candidate_ids: removed,
    };
  }
}
