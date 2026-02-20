import type { UUID } from "@/shared/types";

import type {
  EpisodeContent,
  EpisodeReader,
} from "../../application/ports/EpisodeReader";

export class IngestionContextAdapter implements EpisodeReader {
  async findById(id: UUID): Promise<EpisodeContent | null> {
    const { manageEpisodes } = await import("@/contexts/ingestion");
    try {
      const ep = await manageEpisodes.get(id);
      return this.toContent(ep);
    } catch {
      return null;
    }
  }

  async findByIds(
    ids: ReadonlyArray<UUID>
  ): Promise<Map<UUID, EpisodeContent>> {
    const result = new Map<UUID, EpisodeContent>();
    for (const id of ids) {
      const content = await this.findById(id);
      if (content) {
        result.set(id, content);
      }
    }
    return result;
  }

  private toContent(ep: {
    id: UUID;
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
    trace: Record<string, unknown>;
    modelVersion: string | null;
    occurredAt: Date | null;
    hasNegativeFeedback: boolean;
    piiRedactionCount: number;
  }): EpisodeContent {
    // Extract text representations from structured data
    const inputText = JSON.stringify(ep.inputs).slice(0, 2000);
    const outputText = JSON.stringify(ep.outputs).slice(0, 2000);
    const trace = ep.trace as Record<string, unknown>;
    const turnCount = (trace.turn_count as number) ?? 1;
    const toolCallCount = (trace.tool_call_count as number) ?? 0;
    const inputTokenCount = (trace.input_token_count as number) ?? 0;
    const outputTokenCount = (trace.output_token_count as number) ?? 0;

    return {
      id: ep.id,
      inputText,
      outputText,
      turnCount,
      toolCallCount,
      hasNegativeFeedback: ep.hasNegativeFeedback,
      inputTokenCount,
      outputTokenCount,
      modelVersion: ep.modelVersion,
      occurredAt: ep.occurredAt ?? new Date(),
      piiRedactionStatus: ep.piiRedactionCount > 0 ? "passed" : null,
    };
  }
}
