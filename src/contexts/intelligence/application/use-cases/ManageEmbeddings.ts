import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import { PIIRedactionRequiredError } from "../../domain/errors";
import type { EmbeddingProvider } from "../ports/EmbeddingProvider";
import type {
  EmbeddingRepository,
  EmbeddingRow,
} from "../ports/EmbeddingRepository";
import type { EpisodeReader } from "../ports/EpisodeReader";

export class ManageEmbeddings {
  constructor(
    private readonly embeddingRepo: EmbeddingRepository,
    private readonly embeddingProvider: EmbeddingProvider,
    private readonly episodeReader: EpisodeReader
  ) {}

  async embedCandidate(
    candidateId: UUID,
    episodeId: UUID
  ): Promise<EmbeddingRow> {
    const episode = await this.episodeReader.findById(episodeId);
    if (!episode) {
      throw new Error(`Episode ${episodeId} not found`);
    }

    if (episode.piiRedactionStatus === "failed") {
      throw new PIIRedactionRequiredError(candidateId);
    }

    const text = `${episode.inputText}\n\n${episode.outputText}`;
    const [result] = await this.embeddingProvider.embed([text]);

    if (!result) {
      throw new Error(`Embedding failed for candidate ${candidateId}`);
    }

    const row: Omit<EmbeddingRow, "createdAt" | "updatedAt"> = {
      id: generateId() as UUID,
      candidateId,
      embedding: result.embedding,
      modelId: result.modelId,
      modelVersion: result.modelVersion,
      tokenCount: result.tokenCount,
    };

    await this.embeddingRepo.upsert(row);

    return {
      ...row,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async findByCandidateId(candidateId: UUID): Promise<EmbeddingRow | null> {
    return this.embeddingRepo.findByCandidateId(candidateId);
  }
}
