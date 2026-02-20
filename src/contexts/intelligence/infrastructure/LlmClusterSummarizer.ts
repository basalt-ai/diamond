import { inArray } from "drizzle-orm";
import OpenAI from "openai";
import { z } from "zod";

import type { Database } from "@/db";
import { cdCandidates } from "@/db/schema/candidate";
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
  suggestedFailureModes: z
    .array(
      z.object({
        name: z.string().describe("Short name for the failure mode"),
        description: z
          .string()
          .describe("What goes wrong in this failure mode"),
        severity: z
          .enum(["low", "medium", "high", "critical"])
          .describe("How severe this failure mode is"),
      })
    )
    .describe("Common failure modes for this scenario type"),
  suggestedContextProfile: z
    .object({
      name: z.string().describe("Name for the context profile"),
      attributes: z
        .record(z.string(), z.string())
        .describe(
          "Key-value pairs describing environment dimensions like user type, device, locale"
        ),
    })
    .nullable()
    .describe(
      "Context profile describing typical environment dimensions, or null if not applicable"
    ),
});

const FALLBACK_SUMMARY: ClusterSummary = {
  suggestedName: "Unnamed cluster",
  suggestedDescription: "Auto-detected cluster of similar episodes",
  suggestedRiskCategory: "business",
  suggestedFailureModes: [],
  suggestedContextProfile: null,
};

export class LlmClusterSummarizer implements ClusterSummarizer {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(
    private readonly db: Database,
    private readonly episodeReader: EpisodeReader,
    options?: { model?: string }
  ) {
    this.client = new OpenAI();
    this.model = options?.model ?? "gpt-4o-mini";
  }

  async summarize(representativeCandidateIds: UUID[]): Promise<ClusterSummary> {
    // Resolve candidate IDs → episode IDs
    const rows = await this.db
      .select({ episodeId: cdCandidates.episodeId })
      .from(cdCandidates)
      .where(inArray(cdCandidates.id, representativeCandidateIds));

    const episodeIds = rows.map((r) => r.episodeId).filter(Boolean) as UUID[];

    if (episodeIds.length === 0) {
      return { ...FALLBACK_SUMMARY };
    }

    const episodes = await this.episodeReader.findByIds(episodeIds);

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
              "You are an AI evaluation expert. Given representative agent execution traces from a cluster, identify the abstract task class they represent. Also identify common failure modes (what goes wrong) and the context profile (environment dimensions like user type, device, locale). Respond with JSON.",
          },
          {
            role: "user",
            content: `These agent execution traces were clustered together based on embedding similarity. Identify the common abstract task pattern:\n\n${episodeSummaries}\n\nProvide a JSON object with:\n- suggestedName (short task class name)\n- suggestedDescription (2-3 sentences)\n- suggestedRiskCategory (business, safety, or compliance)\n- suggestedFailureModes (array of {name, description, severity} — 1-3 common failure modes)\n- suggestedContextProfile (object with name and attributes key-value pairs describing environment dimensions, or null if not applicable)`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
        max_tokens: 600,
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
