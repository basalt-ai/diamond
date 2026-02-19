import type {
  ExportMetadata,
  ExportRow,
  FormatSerializer,
} from "../application/ports/FormatSerializer";
import type { ExportFormat } from "../domain/value-objects/ExportFormat";

export class JsonlSerializer implements FormatSerializer {
  readonly format: ExportFormat = "jsonl";
  readonly fileExtension = "jsonl";

  serialize(metadata: ExportMetadata, rows: ExportRow[]): Buffer {
    const lines = [
      JSON.stringify({ _meta: metadata }),
      ...rows.map((row) => JSON.stringify(row)),
    ];
    return Buffer.from(lines.join("\n") + "\n", "utf-8");
  }
}
