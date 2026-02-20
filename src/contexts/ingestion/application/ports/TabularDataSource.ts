import type { SourceSchema } from "../../domain/value-objects/SourceSchema";

export interface TabularDataSource {
  discover(uri: string): Promise<SourceSchema>;
  readBatch(
    uri: string,
    offset: number,
    limit: number
  ): Promise<Record<string, unknown>[]>;
}
