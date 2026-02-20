import { MaxPriorityQueue } from "@datastructures-js/priority-queue";

import type { UUID } from "@/shared/types";

import type {
  SelectionCandidate,
  SelectionOptimizer,
  SelectionRationale,
  SelectionResult,
} from "../application/ports/SelectionOptimizer";
import type { SelectionConstraints } from "../domain/entities/SelectionRun";
import type { ScoreVector } from "../domain/value-objects/ScoreVector";

interface HeapEntry {
  index: number;
  upperBound: number;
  computedAtRound: number;
}

// Equal weights for Phase 2 MVP
const POSITIVE_DIMS: (keyof ScoreVector)[] = [
  "coverageGain",
  "riskWeight",
  "novelty",
  "failureProbability",
];
const PENALTY_DIMS: (keyof ScoreVector)[] = ["redundancyPenalty"];

export class GreedySubmodularOptimizer implements SelectionOptimizer {
  select(
    pool: SelectionCandidate[],
    constraints: SelectionConstraints
  ): SelectionResult {
    const { budget } = constraints;

    if (pool.length === 0 || budget === 0) {
      return { selected: [], coverageImprovement: 0 };
    }

    // If budget exceeds pool, select everything
    const effectiveBudget = Math.min(budget, pool.length);

    const selected = new Set<number>();
    const rationale: SelectionRationale[] = [];

    // Initialize heap with initial marginal gains
    const heap = new MaxPriorityQueue<HeapEntry>((entry) => entry.upperBound);

    for (let i = 0; i < pool.length; i++) {
      const gain = this.marginalGain(i, pool, selected);
      heap.enqueue({ index: i, upperBound: gain, computedAtRound: 0 });
    }

    // Lazy greedy loop
    for (let round = 1; round <= effectiveBudget; round++) {
      while (heap.size() > 0) {
        const top = heap.dequeue();
        if (!top) break;

        if (selected.has(top.index)) continue;

        if (top.computedAtRound === round) {
          // Fresh — this is the true maximum
          selected.add(top.index);
          const candidate = pool[top.index]!;
          rationale.push({
            candidateId: candidate.id,
            rank: round,
            marginalGain: top.upperBound,
          });
          break;
        }

        // Stale — recompute
        const freshGain = this.marginalGain(top.index, pool, selected);
        top.upperBound = freshGain;
        top.computedAtRound = round;
        heap.enqueue(top);
      }
    }

    // Compute coverage improvement (fraction of distinct scenarios covered)
    const scenarioSet = new Set<string>();
    for (const idx of selected) {
      const c = pool[idx]!;
      if (c.scenarioTypeId) scenarioSet.add(c.scenarioTypeId);
    }
    const allScenarios = new Set(
      pool.filter((c) => c.scenarioTypeId).map((c) => c.scenarioTypeId!)
    );
    const coverageImprovement =
      allScenarios.size > 0 ? scenarioSet.size / allScenarios.size : 0;

    return { selected: rationale, coverageImprovement };
  }

  private marginalGain(
    candidateIndex: number,
    pool: SelectionCandidate[],
    selected: Set<number>
  ): number {
    const candidate = pool[candidateIndex]!;
    const scores = candidate.normalizedScores;

    let gain = 0;

    // Sum positive dimensions
    for (const dim of POSITIVE_DIMS) {
      gain += scores[dim];
    }

    // Subtract penalty dimensions
    for (const dim of PENALTY_DIMS) {
      gain -= scores[dim];
    }

    // Diversity bonus: if this candidate's scenario is not yet covered, add bonus
    if (candidate.scenarioTypeId) {
      const alreadyCovered = [...selected].some(
        (idx) => pool[idx]?.scenarioTypeId === candidate.scenarioTypeId
      );
      if (!alreadyCovered) {
        gain += 0.5; // bonus for covering a new scenario
      }
    }

    return Math.max(0, gain);
  }
}
