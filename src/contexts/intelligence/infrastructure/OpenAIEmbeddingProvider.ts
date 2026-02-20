import OpenAI from "openai";
import pLimit from "p-limit";
import pRetry from "p-retry";

import { sanitizeError } from "@/lib/api/sanitize";

import type {
  EmbeddingProvider,
  EmbeddingResult,
} from "../application/ports/EmbeddingProvider";
import { SpendCapExceededError } from "../domain/errors";

export const EMBEDDING_CONFIG = {
  modelId: "oai-te3s-1536",
  provider: "openai",
  modelName: "text-embedding-3-small",
  dimensions: 1536,
} as const;

const MAX_BATCH_SIZE = 2048;
const CONCURRENT_REQUESTS = 3;

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private readonly client: OpenAI;
  private readonly limit: ReturnType<typeof pLimit>;
  private tokensUsedToday = 0;
  private lastResetDate = "";

  constructor(
    private readonly dailyTokenLimit: number = Number(
      process.env.OPENAI_DAILY_TOKEN_LIMIT ?? "10000000"
    )
  ) {
    this.client = new OpenAI();
    this.limit = pLimit(CONCURRENT_REQUESTS);
  }

  getModelId(): string {
    return EMBEDDING_CONFIG.modelId;
  }

  getDimensions(): number {
    return EMBEDDING_CONFIG.dimensions;
  }

  async embed(texts: string[]): Promise<EmbeddingResult[]> {
    this.resetDailyCounterIfNeeded();

    const results: EmbeddingResult[] = [];

    for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
      const batch = texts.slice(i, i + MAX_BATCH_SIZE);
      const batchResults = await this.limit(() => this.embedBatch(batch));
      results.push(...batchResults);
    }

    return results;
  }

  private async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const response = await pRetry(
      async () => {
        try {
          return await this.client.embeddings.create({
            model: EMBEDDING_CONFIG.modelName,
            input: texts,
            dimensions: EMBEDDING_CONFIG.dimensions,
          });
        } catch (error) {
          throw new Error(sanitizeError(error));
        }
      },
      {
        retries: 3,
        minTimeout: 1000,
        factor: 2,
        shouldRetry: (error) => {
          const msg = error instanceof Error ? error.message : "";
          return msg.includes("429") || msg.includes("500");
        },
      }
    );

    const totalTokens = response.usage?.total_tokens ?? 0;
    this.tokensUsedToday += totalTokens;

    if (this.tokensUsedToday > this.dailyTokenLimit) {
      throw new SpendCapExceededError();
    }

    return response.data.map((item) => ({
      embedding: item.embedding,
      tokenCount: Math.ceil(totalTokens / texts.length),
      modelId: EMBEDDING_CONFIG.modelId,
      modelVersion: response.model,
    }));
  }

  private resetDailyCounterIfNeeded(): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.lastResetDate) {
      this.tokensUsedToday = 0;
      this.lastResetDate = today;
    }
  }
}
