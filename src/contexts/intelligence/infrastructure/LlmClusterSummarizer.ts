import OpenAI from "openai";
import { z } from "zod";

import type { UUID } from "@/shared/types";

import type {
  ClusterSummarizer,
  ClusterSummary,
} from "../application/ports/ClusterSummarizer";
import type { EpisodeReader } from "../application/ports/EpisodeReader";

const summarySchema = z.object({
  suggestedName: z
    .string()
    .describe("Short name for the task class, e.g. 'Tool failure recovery'"),
  suggestedDescription: z
    .string()
    .describe("2-3 sentence description of the abstract task class"),
  suggestedRiskCategory: z
    .enum(["business", "safety", "compliance"])
    .describe("Risk category for this type of scenario"),
});

const FALLBACK_SUMMARY: ClusterSummary = {
  suggestedName: "Unnamed cluster",
  suggestedDescription: "Auto-detected cluster of similar episodes",
  suggestedRiskCategory: "business",
};

export class LlmClusterSummarizer implements ClusterSummarizer {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    private readonly episodeReader: EpisodeReader,
    options?: { model?: string }
  ) {
    this.client = new OpenAI();
    this.model = options?.model ?? "gpt-4o-mini";
  }

  async summarize(representativeEpisodeIds: UUID[]): Promise<ClusterSummary> {
    const episodes = await this.episodeReader.findByIds(
      representativeEpisodeIds
    );

    if (episodes.size === 0) {
      return { ...FALLBACK_SUMMARY };
    }

    const episodeSummaries = Array.from(episodes.values())
      .slice(0, 5)
      .map(
        (ep, i) =>
          `Episode ${i + 1}:\n  Input: ${ep.inputText.slice(0, 500)}\n  Output: ${ep.outputText.slice(0, 500)}\n  Tools: ${ep.toolCallCount} calls, Turns: ${ep.turnCount}`
      )
      .join("\n\n");

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "You are an AI evaluation expert. Given representative agent execution traces from a cluster, identify the abstract task class they represent. Respond with a short name, description, and risk category.",
          },
          {
            role: "user",
            content: `These agent execution traces were clustered together based on embedding similarity. Identify the common abstract task pattern:\n\n${episodeSummaries}\n\nProvide a JSON object with: suggestedName (short task class name), suggestedDescription (2-3 sentences), suggestedRiskCategory (business, safety, or compliance).`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 300,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) return { ...FALLBACK_SUMMARY };

      const parsed = summarySchema.safeParse(JSON.parse(content));
      if (!parsed.success) return { ...FALLBACK_SUMMARY };

      return parsed.data;
    } catch {
      return { ...FALLBACK_SUMMARY };
    }
  }
}
