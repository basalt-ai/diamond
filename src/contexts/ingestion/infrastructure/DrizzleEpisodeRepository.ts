import { and, count, desc, eq, gte, lt } from "drizzle-orm";

import type { Database } from "@/db";
import { igEpisodes } from "@/db/schema/ingestion";
import type { UUID } from "@/shared/types";

import type {
  EpisodeRepository,
  ListEpisodesFilter,
  ListEpisodesResult,
} from "../application/ports/EpisodeRepository";
import type { EpisodeData } from "../domain/entities/Episode";

export class DrizzleEpisodeRepository implements EpisodeRepository {
  constructor(private readonly db: Database) {}

  async insert(
    data: Omit<EpisodeData, "createdAt" | "updatedAt">
  ): Promise<EpisodeData> {
    const [row] = await this.db
      .insert(igEpisodes)
      .values({
        id: data.id,
        source: data.source,
        sourceTraceId: data.sourceTraceId,
        ingestedAt: data.ingestedAt,
        occurredAt: data.occurredAt,
        inputs: data.inputs,
        outputs: data.outputs,
        trace: data.trace,
        outcomes: data.outcomes,
        modelVersion: data.modelVersion,
        locale: data.locale,
        planTier: data.planTier,
        device: data.device,
        scenarioTypeId: data.scenarioTypeId,
        hasNegativeFeedback: data.hasNegativeFeedback,
        artifactUri: data.artifactUri,
        artifactSizeBytes: data.artifactSizeBytes,
        metadata: data.metadata,
        piiRedactionCount: data.piiRedactionCount,
      })
      .returning();
    return row as EpisodeData;
  }

  async findById(id: UUID): Promise<EpisodeData | null> {
    const [row] = await this.db
      .select()
      .from(igEpisodes)
      .where(eq(igEpisodes.id, id));
    return (row as EpisodeData) ?? null;
  }

  async findBySourceAndTraceId(
    source: string,
    sourceTraceId: string
  ): Promise<EpisodeData | null> {
    const [row] = await this.db
      .select()
      .from(igEpisodes)
      .where(
        and(
          eq(igEpisodes.source, source),
          eq(igEpisodes.sourceTraceId, sourceTraceId)
        )
      );
    return (row as EpisodeData) ?? null;
  }

  async list(
    filter: ListEpisodesFilter,
    page: number,
    pageSize: number
  ): Promise<ListEpisodesResult> {
    const conditions = [];

    if (filter.source) {
      conditions.push(eq(igEpisodes.source, filter.source));
    }
    if (filter.modelVersion) {
      conditions.push(eq(igEpisodes.modelVersion, filter.modelVersion));
    }
    if (filter.occurredAfter) {
      conditions.push(gte(igEpisodes.occurredAt, filter.occurredAfter));
    }
    if (filter.occurredBefore) {
      conditions.push(lt(igEpisodes.occurredAt, filter.occurredBefore));
    }
    if (filter.hasNegativeFeedback !== undefined) {
      conditions.push(
        eq(igEpisodes.hasNegativeFeedback, filter.hasNegativeFeedback)
      );
    }
    if (filter.locale) {
      conditions.push(eq(igEpisodes.locale, filter.locale));
    }
    if (filter.planTier) {
      conditions.push(eq(igEpisodes.planTier, filter.planTier));
    }
    if (filter.device) {
      conditions.push(eq(igEpisodes.device, filter.device));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(igEpisodes)
      .where(where);
    const total = totalResult?.value ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select()
      .from(igEpisodes)
      .where(where)
      .orderBy(desc(igEpisodes.ingestedAt))
      .limit(pageSize)
      .offset(offset);

    return { data: rows as EpisodeData[], total };
  }
}
