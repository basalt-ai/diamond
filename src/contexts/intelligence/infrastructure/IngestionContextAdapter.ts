import { eq, inArray } from "drizzle-orm";

import type { Database } from "@/db";
import { igEpisodes } from "@/db/schema/ingestion";
import type { UUID } from "@/shared/types";

import type {
  EpisodeContent,
  EpisodeReader,
} from "../application/ports/EpisodeReader";

export class IngestionContextAdapter implements EpisodeReader {
  constructor(private readonly db: Database) {}

  async findById(id: UUID): Promise<EpisodeContent | null> {
    const [row] = await this.db
      .select()
      .from(igEpisodes)
      .where(eq(igEpisodes.id, id));
    return row ? this.toEpisodeContent(row) : null;
  }

  async findByIds(
    ids: ReadonlyArray<UUID>
  ): Promise<Map<UUID, EpisodeContent>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(igEpisodes)
      .where(inArray(igEpisodes.id, [...ids]));
    const map = new Map<UUID, EpisodeContent>();
    for (const row of rows) {
      map.set(row.id as UUID, this.toEpisodeContent(row));
    }
    return map;
  }

  private toEpisodeContent(
    row: typeof igEpisodes.$inferSelect
  ): EpisodeContent {
    const inputs = row.inputs as Record<string, unknown>;
    const outputs = row.outputs as Record<string, unknown>;
    const trace = row.trace as Record<string, unknown>;

    return {
      id: row.id as UUID,
      inputText: this.extractText(inputs),
      outputText: this.extractText(outputs),
      turnCount: this.extractNumber(trace, "turn_count", 1),
      toolCallCount: this.extractNumber(trace, "tool_call_count", 0),
      hasNegativeFeedback: row.hasNegativeFeedback,
      inputTokenCount: this.extractNumber(trace, "input_token_count", 0),
      outputTokenCount: this.extractNumber(trace, "output_token_count", 0),
      modelVersion: row.modelVersion,
      occurredAt: row.occurredAt ?? row.ingestedAt,
      piiRedactionStatus: row.piiRedactionCount > 0 ? "passed" : null,
    };
  }

  private extractText(obj: Record<string, unknown>): string {
    // Try common keys for text content
    for (const key of [
      "span_input",
      "span_output",
      "text",
      "content",
      "message",
    ]) {
      const val = obj[key];
      if (typeof val === "string") return val;
    }
    // Fallback: stringify the whole object
    return JSON.stringify(obj);
  }

  private extractNumber(
    obj: Record<string, unknown>,
    key: string,
    fallback: number
  ): number {
    const val = obj[key];
    return typeof val === "number" ? val : fallback;
  }
}
