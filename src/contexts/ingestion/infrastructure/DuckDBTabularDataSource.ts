import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

import { Database } from "duckdb-async";

import type { TabularDataSource } from "../application/ports/TabularDataSource";
import { SchemaDiscoveryError } from "../domain/errors";
import type {
  DiscoveredColumn,
  SourceSchema,
} from "../domain/value-objects/SourceSchema";

const FORMAT_BY_EXT: Record<string, string> = {
  ".csv": "csv",
  ".tsv": "csv",
  ".parquet": "parquet",
  ".jsonl": "jsonl",
  ".ndjson": "jsonl",
  ".json": "jsonl",
  ".duckdb": "duckdb",
};

function detectFormat(uri: string): string {
  const lower = uri.toLowerCase();
  for (const [ext, format] of Object.entries(FORMAT_BY_EXT)) {
    if (lower.endsWith(ext)) return format;
  }
  return "csv";
}

function buildReadExpr(uri: string, format: string): string {
  switch (format) {
    case "parquet":
      return `read_parquet('${uri}')`;
    case "jsonl":
      return `read_json_auto('${uri}')`;
    case "csv":
    default:
      return `read_csv_auto('${uri}')`;
  }
}

/** Recursively convert BigInt values to Number so JSON.stringify works. */
function sanitize(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitize);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitize(v);
    }
    return out;
  }
  return value;
}

function sanitizeRows(
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  return rows.map((row) => sanitize(row) as Record<string, unknown>);
}

export class DuckDBTabularDataSource implements TabularDataSource {
  private async withDb<T>(fn: (db: Database) => Promise<T>): Promise<T> {
    const db = await Database.create(":memory:");
    try {
      return await fn(db);
    } finally {
      await db.close();
    }
  }

  async discover(uri: string): Promise<SourceSchema> {
    try {
      return await this.withDb(async (db) => {
        const format = detectFormat(uri);
        const readExpr = buildReadExpr(uri, format);

        const describeRows = await db.all(`DESCRIBE SELECT * FROM ${readExpr}`);

        const countResult = await db.all(
          `SELECT COUNT(*) AS cnt FROM ${readExpr}`
        );
        const rowCount = Number(countResult[0]?.cnt ?? 0);

        const sampleRows = sanitizeRows(
          await db.all(`SELECT * FROM ${readExpr} LIMIT 5`)
        );

        const columns: DiscoveredColumn[] = describeRows.map(
          (row: Record<string, unknown>) => {
            const name = String(row.column_name);
            const type = String(row.column_type);
            const nullable = row.null !== "NO";
            const sampleValues = sampleRows
              .map((sr: Record<string, unknown>) => sr[name])
              .filter((v: unknown) => v != null)
              .slice(0, 5);
            return { name, type, nullable, sampleValues };
          }
        );

        const checksum = await this.computeChecksum(uri);

        return { format, rowCount, columns, checksum };
      });
    } catch (error) {
      if (error instanceof SchemaDiscoveryError) throw error;
      throw new SchemaDiscoveryError(
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  async readBatch(
    uri: string,
    offset: number,
    limit: number
  ): Promise<Record<string, unknown>[]> {
    return this.withDb(async (db) => {
      const format = detectFormat(uri);
      const readExpr = buildReadExpr(uri, format);
      const rows = await db.all(
        `SELECT * FROM ${readExpr} LIMIT ${limit} OFFSET ${offset}`
      );
      return sanitizeRows(rows as Record<string, unknown>[]);
    });
  }

  private async computeChecksum(uri: string): Promise<string> {
    try {
      if (uri.startsWith("s3://")) {
        return `sha256:s3-${createHash("sha256").update(uri).digest("hex").slice(0, 16)}`;
      }
      const buffer = await readFile(uri);
      const hash = createHash("sha256")
        .update(buffer.subarray(0, 1024 * 1024))
        .digest("hex");
      return `sha256:${hash}`;
    } catch {
      return `sha256:unknown`;
    }
  }
}
