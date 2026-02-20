import type { EpisodeContent } from "../application/ports/EpisodeReader";
import type { FeatureExtractor } from "../application/ports/FeatureExtractor";
import type { FeatureSet } from "../domain/value-objects/FeatureSet";

export class EpisodeFeatureExtractor implements FeatureExtractor {
  extract(episode: EpisodeContent): FeatureSet {
    const ageMs = Date.now() - episode.occurredAt.getTime();

    return {
      turnCount: episode.turnCount,
      toolCallCount: episode.toolCallCount,
      hasNegativeFeedback: episode.hasNegativeFeedback,
      inputTokenCount: episode.inputTokenCount,
      outputTokenCount: episode.outputTokenCount,
      modelVersion: episode.modelVersion,
      episodeAgeHours: ageMs / (1000 * 60 * 60),
      toolErrorRate:
        episode.toolCallCount > 0
          ? 0 // will be enriched when tool error data is available
          : 0,
    };
  }
}
