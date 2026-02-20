import { and, count, desc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { cdCandidates } from "@/db/schema/candidate";
import { NotFoundError } from "@/lib/domain/DomainError";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  CandidateRepository,
  ListCandidatesFilter,
  ListCandidatesResult,
} from "../application/ports/CandidateRepository";
import type {
  CandidateData,
  CandidateState,
} from "../domain/entities/Candidate";

export class DrizzleCandidateRepository implements CandidateRepository {
  constructor(private readonly db: Database) {}

  async create(params: {
    episodeId: UUID;
    scenarioTypeId: UUID | null;
    mappingConfidence: number;
  }): Promise<CandidateData> {
    const id = generateId();
    const [row] = await this.db
      .insert(cdCandidates)
      .values({
        id,
        episodeId: params.episodeId,
        scenarioTypeId: params.scenarioTypeId,
        mappingConfidence: params.mappingConfidence,
      })
      .returning();
    return row as CandidateData;
  }

  async findById(id: UUID): Promise<CandidateData | null> {
    const [row] = await this.db
      .select()
      .from(cdCandidates)
      .where(eq(cdCandidates.id, id));
    return (row as CandidateData) ?? null;
  }

  async list(
    filter: ListCandidatesFilter,
    page: number,
    pageSize: number
  ): Promise<ListCandidatesResult> {
    const conditions = [];

    if (filter.state) {
      conditions.push(eq(cdCandidates.state, filter.state));
    }
    if (filter.scenarioTypeId) {
      conditions.push(eq(cdCandidates.scenarioTypeId, filter.scenarioTypeId));
    }
    if (filter.episodeId) {
      conditions.push(eq(cdCandidates.episodeId, filter.episodeId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(cdCandidates)
      .where(where);
    const total = totalResult?.value ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select()
      .from(cdCandidates)
      .where(where)
      .orderBy(desc(cdCandidates.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { data: rows as CandidateData[], total };
  }

  async updateState(id: UUID, state: CandidateState): Promise<CandidateData> {
    const [row] = await this.db
      .update(cdCandidates)
      .set({ state, updatedAt: new Date() })
      .where(eq(cdCandidates.id, id))
      .returning();
    return row as CandidateData;
  }

  async updateWithScoring(
    id: UUID,
    data: {
      state: CandidateState;
      scores: Record<string, unknown>;
      features: Record<string, unknown>;
      scenarioTypeId: UUID | null;
      mappingConfidence: number;
    }
  ): Promise<void> {
    const rows = await this.db
      .update(cdCandidates)
      .set({
        state: data.state,
        scores: data.scores,
        features: data.features,
        scenarioTypeId: data.scenarioTypeId,
        mappingConfidence: data.mappingConfidence,
        scoringDirty: false,
        updatedAt: new Date(),
      })
      .where(eq(cdCandidates.id, id))
      .returning({ id: cdCandidates.id });
    if (rows.length === 0) throw new NotFoundError("Candidate", id);
  }

  async updateEmbedding(id: UUID, embeddedAt: Date): Promise<void> {
    const rows = await this.db
      .update(cdCandidates)
      .set({ embeddedAt, updatedAt: new Date() })
      .where(eq(cdCandidates.id, id))
      .returning({ id: cdCandidates.id });
    if (rows.length === 0) throw new NotFoundError("Candidate", id);
  }

  async findByEpisodeId(episodeId: UUID): Promise<CandidateData | null> {
    const [row] = await this.db
      .select()
      .from(cdCandidates)
      .where(eq(cdCandidates.episodeId, episodeId));
    return (row as CandidateData) ?? null;
  }
}
