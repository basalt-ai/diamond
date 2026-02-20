import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { EpisodeData } from "../../domain/entities/Episode";
import {
  EpisodeNotFoundError,
  PIIRedactionFailedError,
} from "../../domain/errors";
import type { ConnectorRegistry } from "../../infrastructure/connectors/ConnectorRegistry";
import type { NormalizedEpisode } from "../../infrastructure/connectors/types";
import type { ArtifactStore } from "../ports/ArtifactStore";
import type {
  EpisodeRepository,
  ListEpisodesFilter,
  ListEpisodesResult,
} from "../ports/EpisodeRepository";
import type { PIIRedactor } from "../ports/PIIRedactor";

export interface IngestResult {
  episode: EpisodeData;
  isNew: boolean;
}

export interface IngestEpisodeInput {
  source: string;
  occurred_at?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  trace?: Record<string, unknown>;
  outcomes?: Record<string, unknown>;
  user_segment?: {
    locale?: string;
    plan_tier?: string;
    device?: string;
  };
  model_version?: string;
  scenario_type_id?: string;
  metadata?: Record<string, unknown>;
}

export class ManageEpisodes {
  constructor(
    private readonly repo: EpisodeRepository,
    private readonly artifactStore: ArtifactStore,
    private readonly piiRedactor: PIIRedactor,
    private readonly connectorRegistry: ConnectorRegistry
  ) {}

  async ingest(input: IngestEpisodeInput): Promise<IngestResult> {
    const { source } = input;

    // 1. Resolve connector and normalize
    const connector = this.connectorRegistry.resolve(source);
    const normalized = connector.normalize(
      input as unknown as Record<string, unknown>
    );

    // 2. Ingest the normalized episode
    return this.ingestNormalized(
      source,
      normalized,
      input.scenario_type_id as UUID | undefined
    );
  }

  async ingestNormalized(
    source: string,
    normalized: NormalizedEpisode,
    scenarioTypeId?: UUID
  ): Promise<IngestResult> {
    // 1. Check dedup — idempotent return if exists
    const existing = await this.repo.findBySourceAndTraceId(
      source,
      normalized.sourceTraceId
    );
    if (existing) {
      return { episode: existing, isNew: false };
    }

    // 2. PII redaction on stringified data fields
    const dataToRedact = {
      inputs: normalized.inputs,
      outputs: normalized.outputs,
      trace: normalized.trace,
      outcomes: normalized.outcomes,
    };

    let redactedData: typeof dataToRedact;
    let piiRedactionCount: number;

    try {
      const serialized = JSON.stringify(dataToRedact);
      const { redactedText, redactionCount } =
        this.piiRedactor.redact(serialized);
      redactedData = JSON.parse(redactedText) as typeof dataToRedact;
      piiRedactionCount = redactionCount;
    } catch (error) {
      throw new PIIRedactionFailedError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }

    // 3. Prepare episode data
    const id = generateId();
    const artifactPath = `episodes/${id}.json`;
    const artifactBuffer = Buffer.from(
      JSON.stringify({
        source,
        source_trace_id: normalized.sourceTraceId,
        inputs: redactedData.inputs,
        outputs: redactedData.outputs,
        trace: redactedData.trace,
        outcomes: redactedData.outcomes,
      })
    );

    // 4. Store artifact
    const { sizeBytes } = await this.artifactStore.write(
      artifactPath,
      artifactBuffer
    );

    // 5. Persist metadata (compensate on failure)
    let episode: EpisodeData;
    try {
      episode = await this.repo.insert({
        id,
        source,
        sourceTraceId: normalized.sourceTraceId,
        ingestedAt: new Date(),
        occurredAt: normalized.occurredAt,
        inputs: redactedData.inputs,
        outputs: redactedData.outputs,
        trace: redactedData.trace,
        outcomes: redactedData.outcomes,
        modelVersion: normalized.modelVersion,
        locale: normalized.userSegment.locale ?? null,
        planTier: normalized.userSegment.planTier ?? null,
        device: normalized.userSegment.device ?? null,
        scenarioTypeId: scenarioTypeId ?? null,
        hasNegativeFeedback: normalized.hasNegativeFeedback,
        artifactUri: artifactPath,
        artifactSizeBytes: sizeBytes,
        metadata: normalized.metadata,
        piiRedactionCount,
      });
    } catch (error) {
      // Compensate: delete orphaned artifact
      await this.artifactStore.delete(artifactPath);
      throw error;
    }

    // 6. Emit event
    await eventBus.publish({
      eventId: generateId(),
      eventType: "episode.ingested",
      aggregateId: episode.id,
      occurredAt: new Date(),
      payload: {
        episode_id: episode.id,
        source: episode.source,
        occurred_at: episode.occurredAt?.toISOString() ?? null,
        model_version: episode.modelVersion,
        locale: episode.locale,
        plan_tier: episode.planTier,
        device: episode.device,
        has_negative_feedback: episode.hasNegativeFeedback,
        artifact_uri: episode.artifactUri,
        scenario_type_id: episode.scenarioTypeId,
      },
    });

    return { episode, isNew: true };
  }

  async get(id: UUID): Promise<EpisodeData> {
    const episode = await this.repo.findById(id);
    if (!episode) {
      throw new EpisodeNotFoundError(id);
    }
    return episode;
  }

  async list(
    filter: ListEpisodesFilter,
    page: number,
    pageSize: number
  ): Promise<ListEpisodesResult> {
    return this.repo.list(filter, page, pageSize);
  }
}
