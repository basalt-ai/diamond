import type { FeatureSet } from "../../domain/value-objects/FeatureSet";
import type { EpisodeContent } from "./EpisodeReader";

export interface FeatureExtractor {
  extract(episode: EpisodeContent): FeatureSet;
}
