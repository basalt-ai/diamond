import { createHash } from "node:crypto";

import type { EpisodeConnector, NormalizedEpisode } from "./types";

const NEGATIVE_FEEDBACK_KEYS = [
  "negative_feedback",
  "thumbs_down",
  "dislike",
  "negative",
];

export class GenericJsonConnector implements EpisodeConnector {
  readonly sourceType = "generic_json";

  normalize(rawPayload: Record<string, unknown>): NormalizedEpisode {
    const trace = (rawPayload.trace as Record<string, unknown>) ?? {};
    const outcomes = (rawPayload.outcomes as Record<string, unknown>) ?? {};
    const userSegment =
      (rawPayload.user_segment as Record<string, unknown>) ?? {};

    return {
      sourceTraceId: this.extractTraceId(trace, rawPayload),
      occurredAt: this.parseDate(rawPayload.occurred_at),
      inputs: (rawPayload.inputs as Record<string, unknown>) ?? {},
      outputs: (rawPayload.outputs as Record<string, unknown>) ?? {},
      trace,
      outcomes,
      userSegment: {
        locale: asString(userSegment.locale),
        planTier: asString(userSegment.plan_tier),
        device: asString(userSegment.device),
      },
      modelVersion: asString(rawPayload.model_version) ?? null,
      hasNegativeFeedback: this.detectNegativeFeedback(outcomes),
      metadata: (rawPayload.metadata as Record<string, unknown>) ?? {},
    };
  }

  private extractTraceId(
    trace: Record<string, unknown>,
    rawPayload: Record<string, unknown>
  ): string {
    if (typeof trace.id === "string" && trace.id.length > 0) {
      return trace.id;
    }
    if (
      typeof trace.conversation_id === "string" &&
      trace.conversation_id.length > 0
    ) {
      const turnId = typeof trace.turn_id === "string" ? trace.turn_id : "0";
      return `${trace.conversation_id}:${turnId}`;
    }
    // Fallback: hash the entire payload for a deterministic trace ID
    const hash = createHash("sha256")
      .update(JSON.stringify(rawPayload))
      .digest("hex")
      .slice(0, 32);
    return `hash:${hash}`;
  }

  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === "string") {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  private detectNegativeFeedback(outcomes: Record<string, unknown>): boolean {
    for (const key of NEGATIVE_FEEDBACK_KEYS) {
      if (outcomes[key] === true) return true;
    }
    return false;
  }
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
