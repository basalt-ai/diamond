import { createHash } from "node:crypto";

import type { FieldMapping } from "../../domain/value-objects/FieldMapping";
import type { NormalizedEpisode } from "./types";

function mergeColumns(
  row: Record<string, unknown>,
  refs: Array<{ column: string }>
): Record<string, unknown> {
  if (refs.length === 1) {
    const value = row[refs[0]!.column];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return { [refs[0]!.column]: value };
  }
  const result: Record<string, unknown> = {};
  for (const ref of refs) {
    result[ref.column] = row[ref.column];
  }
  return result;
}

function extractSingle(
  row: Record<string, unknown>,
  ref: { column: string } | undefined
): string | null {
  if (!ref) return null;
  const value = row[ref.column];
  if (value == null) return null;
  return String(value);
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function parseBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  if (typeof value === "number") return value !== 0;
  return false;
}

export class MappedRowConnector {
  constructor(
    private readonly mapping: FieldMapping,
    private readonly sourceLabel: string
  ) {}

  normalize(row: Record<string, unknown>): NormalizedEpisode {
    const traceId = this.extractTraceId(row);

    return {
      sourceTraceId: traceId,
      occurredAt: parseDate(
        this.mapping.occurredAt ? row[this.mapping.occurredAt.column] : null
      ),
      inputs: mergeColumns(row, this.mapping.inputs),
      outputs: mergeColumns(row, this.mapping.outputs),
      trace: this.mapping.trace ? mergeColumns(row, this.mapping.trace) : {},
      outcomes: this.mapping.outcomes
        ? mergeColumns(row, this.mapping.outcomes)
        : {},
      userSegment: {
        locale: extractSingle(row, this.mapping.locale) ?? undefined,
        planTier: extractSingle(row, this.mapping.planTier) ?? undefined,
        device: extractSingle(row, this.mapping.device) ?? undefined,
      },
      modelVersion: extractSingle(row, this.mapping.modelVersion),
      hasNegativeFeedback: this.mapping.hasNegativeFeedback
        ? parseBool(row[this.mapping.hasNegativeFeedback.column])
        : false,
      metadata: this.buildMetadata(row),
    };
  }

  private extractTraceId(row: Record<string, unknown>): string {
    if (this.mapping.traceId) {
      const value = row[this.mapping.traceId.column];
      if (value != null && String(value).length > 0) {
        return String(value);
      }
    }
    const hash = createHash("sha256")
      .update(JSON.stringify(row))
      .digest("hex")
      .slice(0, 32);
    return `hash:${hash}`;
  }

  private buildMetadata(row: Record<string, unknown>): Record<string, unknown> {
    if (!this.mapping.metadata) return {};
    const result: Record<string, unknown> = {};
    for (const ref of this.mapping.metadata) {
      result[ref.column] = row[ref.column];
    }
    return result;
  }
}
