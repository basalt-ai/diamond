import type { UUID } from "@/shared/types";

export interface RedundancyOracle {
  /** Compute max cosine similarity between candidate and the selected set */
  computeRedundancy(
    candidateId: UUID,
    selectedIds: ReadonlyArray<UUID>
  ): Promise<number>;

  /** Batch: compute redundancy for multiple candidates at once */
  computeRedundancyBatch(
    candidateIds: ReadonlyArray<UUID>,
    selectedIds: ReadonlyArray<UUID>
  ): Promise<Map<UUID, number>>;

  /** 1 - maxSimilarity to any other embedding (how novel is this candidate) */
  computeNovelty(candidateId: UUID): Promise<number>;

  /** Batch novelty computation */
  computeNoveltyBatch(
    candidateIds: ReadonlyArray<UUID>
  ): Promise<Map<UUID, number>>;
}
