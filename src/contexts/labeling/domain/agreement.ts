import type { LabelData } from "./entities/Label";
import type {
  DiscreteValue,
  ExtractiveValue,
  LabelType,
  RubricScoredValue,
  SetValuedValue,
} from "./value-objects/LabelValue";

// Agreement thresholds by label type (Phase 1: constants)
export const AGREEMENT_THRESHOLDS: Record<LabelType, number> = {
  discrete: 1.0,
  extractive: 0.7,
  generative: -1, // Always requires adjudication
  rubric_scored: 0.8,
  set_valued: 0.7,
};

export function computeAgreement(
  labels: LabelData[],
  labelType: LabelType
): number {
  if (labels.length < 2) return 0;

  switch (labelType) {
    case "discrete":
      return computeDiscreteAgreement(labels);
    case "extractive":
      return computeExtractiveAgreement(labels);
    case "generative":
      return -1; // Always triggers adjudication
    case "rubric_scored":
      return computeRubricScoredAgreement(labels);
    case "set_valued":
      return computeSetValuedAgreement(labels);
  }
}

function computeDiscreteAgreement(labels: LabelData[]): number {
  const values = labels.map((l) => (l.value as DiscreteValue).choice);
  return values.every((v) => v === values[0]) ? 1.0 : 0.0;
}

function computeExtractiveAgreement(labels: LabelData[]): number {
  // Token-level F1 overlap between the two labels' span texts
  const texts = labels.map((l) =>
    (l.value as ExtractiveValue).spans.map((s) => s.text).join(" ")
  );
  const tokens0 = new Set(texts[0]!.toLowerCase().split(/\s+/));
  const tokens1 = new Set(texts[1]!.toLowerCase().split(/\s+/));

  let overlap = 0;
  for (const t of tokens0) {
    if (tokens1.has(t)) overlap++;
  }

  if (tokens0.size === 0 && tokens1.size === 0) return 1.0;
  const precision = tokens0.size > 0 ? overlap / tokens0.size : 0;
  const recall = tokens1.size > 0 ? overlap / tokens1.size : 0;

  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

function computeRubricScoredAgreement(labels: LabelData[]): number {
  // Weighted mean absolute difference, normalized to 0-1
  const scores0 = (labels[0]!.value as RubricScoredValue).scores;
  const scores1 = (labels[1]!.value as RubricScoredValue).scores;

  const map1 = new Map(scores1.map((s) => [s.criterion_id, s.score]));

  let totalDiff = 0;
  let count = 0;
  for (const s of scores0) {
    const other = map1.get(s.criterion_id);
    if (other !== undefined) {
      totalDiff += Math.abs(s.score - other) / 10; // Normalize by max score
      count++;
    }
  }

  if (count === 0) return 0;
  return 1 - totalDiff / count;
}

function computeSetValuedAgreement(labels: LabelData[]): number {
  // Jaccard index
  const set0 = new Set((labels[0]!.value as SetValuedValue).values);
  const set1 = new Set((labels[1]!.value as SetValuedValue).values);

  let intersection = 0;
  for (const v of set0) {
    if (set1.has(v)) intersection++;
  }

  const union = set0.size + set1.size - intersection;
  if (union === 0) return 1.0;
  return intersection / union;
}

export function computeLabelDistribution(
  labels: LabelData[],
  labelType: LabelType
): Record<string, number> {
  const dist: Record<string, number> = {};

  for (const label of labels) {
    switch (labelType) {
      case "discrete": {
        const choice = (label.value as DiscreteValue).choice;
        dist[choice] = (dist[choice] ?? 0) + 1;
        break;
      }
      case "set_valued": {
        for (const v of (label.value as SetValuedValue).values) {
          dist[v] = (dist[v] ?? 0) + 1;
        }
        break;
      }
      default: {
        // For other types, key by annotator
        dist[label.annotatorId] = label.confidence;
      }
    }
  }

  return dist;
}
