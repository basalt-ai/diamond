import { createHash } from "node:crypto";

import { DuplicateError, NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import { ExportJob } from "../../domain/entities/ExportJob";
import type { ExportJobData } from "../../domain/entities/ExportJob";
import { ExportNotReleasedError } from "../../domain/errors";
import type { ExportFormat } from "../../domain/value-objects/ExportFormat";
import type { ArtifactStore } from "../ports/ArtifactStore";
import type { CandidateDataReader } from "../ports/CandidateDataReader";
import type { DatasetVersionReader } from "../ports/DatasetVersionReader";
import type {
  ExportJobRepository,
  ListExportJobsFilter,
  ListExportJobsResult,
} from "../ports/ExportJobRepository";
import type {
  ExportMetadata,
  ExportRow,
  FormatSerializer,
} from "../ports/FormatSerializer";
import type { LabelDataReader } from "../ports/LabelDataReader";

export class ManageExports {
  constructor(
    private readonly repo: ExportJobRepository,
    private readonly datasetVersionReader: DatasetVersionReader,
    private readonly candidateDataReader: CandidateDataReader,
    private readonly labelDataReader: LabelDataReader,
    private readonly artifactStore: ArtifactStore,
    private readonly serializers: Record<ExportFormat, FormatSerializer>
  ) {}

  async create(input: {
    dataset_version_id: string;
    format: ExportFormat;
  }): Promise<ExportJobData> {
    const versionId = input.dataset_version_id as UUID;

    // 1. Validate dataset version exists
    const version = await this.datasetVersionReader.getById(versionId);
    if (!version) {
      throw new NotFoundError("DatasetVersion", versionId);
    }

    // 2. Validate state is released
    if (version.state !== "released") {
      throw new ExportNotReleasedError(versionId);
    }

    // 3. Check for existing non-failed export
    const existing = await this.repo.findByVersionAndFormat(
      versionId,
      input.format
    );
    if (existing && existing.state !== "failed") {
      throw new DuplicateError(
        "ExportJob",
        "dataset_version_id+format",
        `${versionId}+${input.format}`
      );
    }

    // If a failed export exists, delete it before creating a new one
    if (existing && existing.state === "failed") {
      await this.repo.delete(existing.id);
    }

    // 4. Create job
    const job = new ExportJob({
      id: generateId(),
      datasetVersionId: versionId,
      format: input.format,
      state: "pending",
      artifactPath: null,
      artifactSizeBytes: null,
      artifactChecksum: null,
      rowCount: null,
      metadata: {},
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    });

    await this.repo.create(job.toData());

    // 5. Process
    job.startProcessing();
    await this.repo.update(job.toData());

    try {
      // 6. Read candidate data
      const candidateIds = version.candidateIds as UUID[];
      const candidates = await this.candidateDataReader.getMany(candidateIds);

      // 7. Read label data
      const labels =
        await this.labelDataReader.getLabelsForCandidates(candidateIds);

      // 8. Build label lookup by candidate
      const labelsByCandidate = new Map<string, typeof labels>();
      for (const label of labels) {
        const existing = labelsByCandidate.get(label.candidateId) ?? [];
        existing.push(label);
        labelsByCandidate.set(label.candidateId, existing);
      }

      // 9. Assemble rows (sorted by candidate_id for determinism)
      const candidateMap = new Map(candidates.map((c) => [c.id, c]));
      const sortedCandidateIds = [...candidateIds].sort();

      const rows: ExportRow[] = [];
      for (const candidateId of sortedCandidateIds) {
        const candidate = candidateMap.get(candidateId as UUID);
        if (!candidate) continue;

        const candidateLabels = labelsByCandidate.get(candidateId) ?? [];
        rows.push({
          candidate_id: candidate.id,
          episode_id: candidate.episodeId,
          scenario_type_id: candidate.scenarioTypeId,
          labels: candidateLabels.map((l) => ({
            label_task_id: l.labelTaskId,
            annotator_id: l.annotatorId,
            value: l.value,
          })),
        });
      }

      // 10. Build metadata
      const lineageHash = version.lineage
        ? `sha256:${createHash("sha256").update(JSON.stringify(version.lineage)).digest("hex")}`
        : "sha256:none";

      const gateResults = version.gateResults ?? [];
      const metadata: ExportMetadata = {
        version: version.version,
        suite_id: version.suiteId,
        scenario_graph_version: version.scenarioGraphVersion,
        candidate_count: rows.length,
        lineage_hash: lineageHash,
        exported_at: new Date().toISOString(),
        format: input.format,
        gate_results_summary: {
          all_passed: gateResults.every(
            (g) => (g as Record<string, unknown>).passed === true
          ),
          gates: gateResults.length,
        },
      };

      // 11. Serialize
      const serializer = this.serializers[input.format];
      const content = serializer.serialize(metadata, rows);

      // 12. Compute checksum
      const checksum = createHash("sha256").update(content).digest("hex");

      // 13. Write artifact
      const artifactPath = `${versionId}/${job.id}.${serializer.fileExtension}`;
      const { sizeBytes } = await this.artifactStore.write(
        artifactPath,
        content
      );

      // 14. Complete job
      job.complete({
        path: artifactPath,
        sizeBytes,
        checksum,
        rowCount: rows.length,
        metadata: metadata as unknown as Record<string, unknown>,
      });
    } catch (error) {
      job.fail(error instanceof Error ? error.message : "Unknown export error");
      await this.repo.update(job.toData());
      await eventBus.publishAll(job.domainEvents);
      throw error;
    }

    // 15. Persist completed state and publish events
    const result = await this.repo.update(job.toData());
    await eventBus.publishAll(job.domainEvents);
    return result;
  }

  async get(id: UUID): Promise<ExportJobData> {
    const job = await this.repo.findById(id);
    if (!job) {
      throw new NotFoundError("ExportJob", id);
    }
    return job;
  }

  async list(
    filter: ListExportJobsFilter,
    page: number,
    pageSize: number
  ): Promise<ListExportJobsResult> {
    return this.repo.list(filter, page, pageSize);
  }

  async getArtifactStream(id: UUID): Promise<{
    stream: ReadableStream;
    filename: string;
    contentType: string;
  }> {
    const job = await this.repo.findById(id);
    if (!job) {
      throw new NotFoundError("ExportJob", id);
    }
    if (job.state !== "completed" || !job.artifactPath) {
      throw new NotFoundError("ExportArtifact", id);
    }

    const stream = this.artifactStore.readStream(job.artifactPath);
    const filename =
      job.artifactPath.split("/").pop() ?? `export.${job.format}`;
    const contentType =
      job.format === "jsonl"
        ? "application/x-ndjson"
        : "application/octet-stream";

    return { stream, filename, contentType };
  }
}
