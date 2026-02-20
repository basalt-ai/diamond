import type { ScoreDimension, ScoreVector } from "../value-objects/ScoreVector";
import { SCORE_DIMENSIONS } from "../value-objects/ScoreVector";

/**
 * Rank-based normalization: maps raw scores to [0, 1] uniformly.
 * Rank / (n-1) for each dimension. Works for any pool size.
 */
export function normalizeByRank(
  scores: ReadonlyArray<ScoreVector>,
  dimension: ScoreDimension
): number[] {
  const indexed = scores.map((s, i) => ({ i, v: s[dimension] }));
  indexed.sort((a, b) => a.v - b.v);

  const result = new Array<number>(scores.length);
  for (let rank = 0; rank < indexed.length; rank++) {
    const entry = indexed[rank]!;
    result[entry.i] = scores.length > 1 ? rank / (scores.length - 1) : 0.5;
  }
  return result;
}

/**
 * Normalize all dimensions of a ScoreVector array using rank normalization.
 * Returns a new array of ScoreVectors with normalized values in [0, 1].
 */
export function normalizeAllDimensions(
  scores: ReadonlyArray<ScoreVector>
): ScoreVector[] {
  if (scores.length === 0) return [];

  // Compute rank-normalized values per dimension
  const normalized: Record<string, number[]> = {};
  for (const dim of SCORE_DIMENSIONS) {
    normalized[dim] = normalizeByRank(scores, dim);
  }

  // Assemble normalized ScoreVectors
  return scores.map((_, idx) => {
    const vec: Record<string, number> = {};
    for (const dim of SCORE_DIMENSIONS) {
      vec[dim] = normalized[dim]![idx]!;
    }
    return vec as unknown as ScoreVector;
  });
}
