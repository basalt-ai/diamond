import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  BulkSourceData,
  BulkSourceStatus,
  ImportError,
  ImportProgress,
} from "../../domain/entities/BulkSource";
import { canTransition } from "../../domain/entities/BulkSource";
import {
  BulkSourceNotFoundError,
  InvalidBulkSourceStateError,
  MappingValidationError,
} from "../../domain/errors";
import type { FieldMapping } from "../../domain/value-objects/FieldMapping";
import {
  FieldMappingSchema,
  getAllMappedColumns,
} from "../../domain/value-objects/FieldMapping";
import type { SourceSchema } from "../../domain/value-objects/SourceSchema";
import { MappedRowConnector } from "../../infrastructure/connectors/MappedRowConnector";
import type {
  BulkSourceRepository,
  ListBulkSourcesFilter,
  ListBulkSourcesResult,
} from "../ports/BulkSourceRepository";
import type { TabularDataSource } from "../ports/TabularDataSource";
import type { ManageEpisodes } from "./ManageEpisodes";

const DEFAULT_BATCH_SIZE = 500;
const MAX_ERROR_LOG_SIZE = 1000;

export interface CreateBulkSourceInput {
  name: string;
  uri: string;
  sourceLabel?: string;
}

export class ManageBulkSources {
  constructor(
    private readonly repo: BulkSourceRepository,
    private readonly tabularDataSource: TabularDataSource,
    private readonly manageEpisodes: ManageEpisodes
  ) {}

  async create(input: CreateBulkSourceInput): Promise<BulkSourceData> {
    const id = generateId();
    const sourceLabel = input.sourceLabel ?? `bulk:${id}`;

    return this.repo.insert({
      id,
      name: input.name,
      uri: input.uri,
      format: null,
      status: "pending",
      sourceLabel,
      discoveredSchema: null,
      fieldMapping: null,
      fileChecksum: null,
      rowCount: null,
      importProgress: null,
      errorLog: null,
    });
  }

  async discover(id: UUID): Promise<BulkSourceData> {
    const bs = await this.requireBulkSource(id);
    this.assertTransition(bs.status, "discovered");

    const schema = await this.tabularDataSource.discover(bs.uri);

    return this.repo.update(
      id,
      {
        status: "discovered",
        format: schema.format,
        discoveredSchema: schema as unknown as Record<string, unknown>,
        fileChecksum: schema.checksum,
        rowCount: schema.rowCount,
      },
      bs.updatedAt
    );
  }

  async submitMapping(
    id: UUID,
    rawMapping: Record<string, unknown>
  ): Promise<BulkSourceData> {
    const bs = await this.requireBulkSource(id);
    this.assertTransition(bs.status, "mapped");

    const parsed = FieldMappingSchema.safeParse(rawMapping);
    if (!parsed.success) {
      throw new MappingValidationError(
        parsed.error.issues.map((i) => i.message).join("; ")
      );
    }
    const mapping = parsed.data;

    this.validateColumnsExist(
      mapping,
      bs.discoveredSchema as unknown as SourceSchema
    );

    return this.repo.update(
      id,
      {
        status: "mapped",
        fieldMapping: mapping as unknown as Record<string, unknown>,
      },
      bs.updatedAt
    );
  }

  async preview(id: UUID, limit = 5): Promise<Record<string, unknown>[]> {
    const bs = await this.requireBulkSource(id);
    if (!bs.fieldMapping) {
      throw new MappingValidationError("No field mapping defined");
    }

    const mapping = bs.fieldMapping as unknown as FieldMapping;
    const connector = new MappedRowConnector(mapping, bs.sourceLabel);

    const rows = await this.tabularDataSource.readBatch(bs.uri, 0, limit);
    return rows.map((row) => {
      const normalized = connector.normalize(row);
      return {
        source: bs.sourceLabel,
        source_trace_id: normalized.sourceTraceId,
        inputs: normalized.inputs,
        outputs: normalized.outputs,
        trace: normalized.trace,
        outcomes: normalized.outcomes,
        occurred_at: normalized.occurredAt?.toISOString() ?? null,
        model_version: normalized.modelVersion,
        metadata: normalized.metadata,
      };
    });
  }

  async startImport(
    id: UUID,
    batchSize = DEFAULT_BATCH_SIZE
  ): Promise<BulkSourceData> {
    const bs = await this.requireBulkSource(id);
    this.assertTransition(bs.status, "importing");

    if (!bs.fieldMapping || !bs.rowCount) {
      throw new MappingValidationError(
        "BulkSource must have a field mapping and discovered schema before import"
      );
    }

    const total = bs.rowCount;
    const progress: ImportProgress = {
      total,
      processed: 0,
      succeeded: 0,
      failed: 0,
      deduplicated: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };

    const updated = await this.repo.update(
      id,
      { status: "importing", importProgress: progress, errorLog: [] },
      bs.updatedAt
    );

    // Fire-and-forget the actual import (async, non-blocking)
    this.runImport(
      id,
      bs.uri,
      bs.sourceLabel,
      bs.fieldMapping as unknown as FieldMapping,
      total,
      batchSize
    ).catch((error) => {
      console.error(`[BulkImport] Fatal error for ${id}:`, error);
      this.repo
        .update(id, {
          status: "failed",
          importProgress: {
            ...progress,
            completedAt: new Date().toISOString(),
          },
          errorLog: [
            {
              rowNumber: -1,
              error: error instanceof Error ? error.message : String(error),
            },
          ],
        })
        .catch((e) =>
          console.error(`[BulkImport] Failed to update status:`, e)
        );
    });

    return updated;
  }

  async get(id: UUID): Promise<BulkSourceData> {
    return this.requireBulkSource(id);
  }

  async list(
    filter: ListBulkSourcesFilter,
    page: number,
    pageSize: number
  ): Promise<ListBulkSourcesResult> {
    return this.repo.list(filter, page, pageSize);
  }

  // ── Private ──────────────────────────────────────────────────────

  private async runImport(
    id: UUID,
    uri: string,
    sourceLabel: string,
    mapping: FieldMapping,
    total: number,
    batchSize: number
  ): Promise<void> {
    const connector = new MappedRowConnector(mapping, sourceLabel);
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let deduplicated = 0;
    const errors: ImportError[] = [];

    for (let offset = 0; offset < total; offset += batchSize) {
      const rows = await this.tabularDataSource.readBatch(
        uri,
        offset,
        batchSize
      );

      for (let i = 0; i < rows.length; i++) {
        const rowNumber = offset + i + 1;
        try {
          const normalized = connector.normalize(rows[i]!);
          const result = await this.manageEpisodes.ingestNormalized(
            sourceLabel,
            normalized
          );

          if (result.isNew) {
            succeeded++;
          } else {
            deduplicated++;
          }
        } catch (error) {
          failed++;
          if (errors.length < MAX_ERROR_LOG_SIZE) {
            errors.push({
              rowNumber,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        processed++;
      }

      // Update progress after each batch
      await this.repo.update(id, {
        importProgress: {
          total,
          processed,
          succeeded,
          failed,
          deduplicated,
          startedAt: null, // preserve existing
          completedAt: null,
        },
      });

      // Yield to event loop between batches
      await new Promise((resolve) => setImmediate(resolve));
    }

    // Finalize
    const finalStatus: BulkSourceStatus =
      failed === 0 ? "completed" : "completed_with_errors";

    const completedAt = new Date().toISOString();

    await this.repo.update(id, {
      status: finalStatus,
      importProgress: {
        total,
        processed,
        succeeded,
        failed,
        deduplicated,
        startedAt: null,
        completedAt,
      },
      errorLog: errors.length > 0 ? errors : null,
    });

    // Emit summary event
    await eventBus.publish({
      eventId: generateId(),
      eventType: "bulk_import.completed",
      aggregateId: id,
      occurredAt: new Date(),
      payload: {
        bulk_source_id: id,
        source_label: sourceLabel,
        total_rows: total,
        rows_succeeded: succeeded,
        rows_failed: failed,
        rows_deduplicated: deduplicated,
        status: finalStatus,
      },
    });
  }

  private async requireBulkSource(id: UUID): Promise<BulkSourceData> {
    const bs = await this.repo.findById(id);
    if (!bs) throw new BulkSourceNotFoundError(id);
    return bs;
  }

  private assertTransition(from: BulkSourceStatus, to: BulkSourceStatus): void {
    if (!canTransition(from, to)) {
      throw new InvalidBulkSourceStateError(from, to);
    }
  }

  private validateColumnsExist(
    mapping: FieldMapping,
    schema: SourceSchema
  ): void {
    const schemaColumns = new Set(schema.columns.map((c) => c.name));
    const mappedColumns = getAllMappedColumns(mapping);

    const missing = mappedColumns.filter((col) => !schemaColumns.has(col));
    if (missing.length > 0) {
      throw new MappingValidationError(
        `Columns not found in schema: ${missing.join(", ")}`
      );
    }
  }
}
