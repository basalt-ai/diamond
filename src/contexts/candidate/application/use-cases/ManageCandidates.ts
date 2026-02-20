import { DuplicateError, NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import type { UUID } from "@/shared/types";

import {
  Candidate,
  type CandidateData,
  type CandidateState,
} from "../../domain/entities/Candidate";
import type {
  CandidateRepository,
  ListCandidatesFilter,
  ListCandidatesResult,
} from "../ports/CandidateRepository";
import type { ScenarioReader } from "../ports/ScenarioReader";

export class ManageCandidates {
  constructor(
    private readonly repo: CandidateRepository,
    private readonly scenarioReader: ScenarioReader
  ) {}

  async create(input: {
    episode_id: string;
    scenario_type_id?: string;
  }): Promise<CandidateData> {
    const episodeId = input.episode_id as UUID;
    const scenarioTypeId = (input.scenario_type_id as UUID) ?? null;

    // Validate scenario_type_id if provided
    if (scenarioTypeId) {
      const exists = await this.scenarioReader.exists(scenarioTypeId);
      if (!exists) {
        throw new NotFoundError("ScenarioType", scenarioTypeId);
      }
    }

    // Check for duplicate episode_id
    const existing = await this.repo.findByEpisodeId(episodeId);
    if (existing) {
      throw new DuplicateError("Candidate", "episode_id", episodeId);
    }

    const mappingConfidence = scenarioTypeId ? 1.0 : 0.0;
    const candidate = await this.repo.create({
      episodeId,
      scenarioTypeId,
      mappingConfidence,
    });

    await eventBus.publish({
      eventId: candidate.id,
      eventType: "candidate.created",
      aggregateId: candidate.id,
      occurredAt: new Date(),
      payload: {
        candidate_id: candidate.id,
        episode_id: candidate.episodeId,
        scenario_type_id: candidate.scenarioTypeId,
      },
    });

    return candidate;
  }

  async get(id: UUID): Promise<CandidateData> {
    const candidate = await this.repo.findById(id);
    if (!candidate) {
      throw new NotFoundError("Candidate", id);
    }
    return candidate;
  }

  async list(
    filter: ListCandidatesFilter,
    page: number,
    pageSize: number
  ): Promise<ListCandidatesResult> {
    return this.repo.list(filter, page, pageSize);
  }

  async applyScoring(
    id: UUID,
    params: {
      scores: Record<string, unknown>;
      features: Record<string, unknown>;
      scenarioTypeId: UUID | null;
      mappingConfidence: number;
    }
  ): Promise<void> {
    const data = await this.repo.findById(id);
    if (!data) throw new NotFoundError("Candidate", id);

    const candidate = new Candidate(data);
    const result = candidate.applyScoring(params);

    if (result === "skipped") return;

    await this.repo.updateWithScoring(id, {
      state: candidate.state,
      scores: candidate.scores,
      features: candidate.features,
      scenarioTypeId: candidate.scenarioTypeId,
      mappingConfidence: candidate.mappingConfidence,
    });

    await eventBus.publishAll(candidate.domainEvents);
  }

  async applyEmbedding(id: UUID): Promise<void> {
    await this.repo.updateEmbedding(id, new Date());
  }

  async transition(
    id: UUID,
    targetState: CandidateState
  ): Promise<CandidateData> {
    const data = await this.repo.findById(id);
    if (!data) {
      throw new NotFoundError("Candidate", id);
    }

    // Use aggregate to validate transition
    const candidate = new Candidate(data);
    candidate.transitionTo(targetState);

    // Persist and publish events
    const updated = await this.repo.updateState(id, targetState);
    await eventBus.publishAll(candidate.domainEvents);

    return updated;
  }
}
