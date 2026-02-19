import type { UUID } from "@/shared/types";

import type { EpisodeData } from "../../domain/entities/Episode";

export interface ListEpisodesFilter {
  source?: string;
  modelVersion?: string;
  occurredAfter?: Date;
  occurredBefore?: Date;
  hasNegativeFeedback?: boolean;
  locale?: string;
  planTier?: string;
  device?: string;
}

export interface ListEpisodesResult {
  data: EpisodeData[];
  total: number;
}

export interface EpisodeRepository {
  insert(
    data: Omit<EpisodeData, "createdAt" | "updatedAt">
  ): Promise<EpisodeData>;

  findById(id: UUID): Promise<EpisodeData | null>;

  findBySourceAndTraceId(
    source: string,
    sourceTraceId: string
  ): Promise<EpisodeData | null>;

  list(
    filter: ListEpisodesFilter,
    page: number,
    pageSize: number
  ): Promise<ListEpisodesResult>;
}
