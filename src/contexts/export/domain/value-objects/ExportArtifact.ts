import type { ExportFormat } from "./ExportFormat";

export interface ExportArtifact {
  path: string;
  format: ExportFormat;
  sizeBytes: number;
  checksum: string;
}
