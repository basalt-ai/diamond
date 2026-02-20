import type { UUID } from "@/shared/types";

import type { BulkSourceData } from "../../domain/entities/BulkSource";

export interface ListBulkSourcesFilter {
  status?: string;
}

export interface ListBulkSourcesResult {
  data: BulkSourceData[];
  total: number;
}

export interface BulkSourceRepository {
  insert(
    data: Omit<BulkSourceData, "createdAt" | "updatedAt">
  ): Promise<BulkSourceData>;

  findById(id: UUID): Promise<BulkSourceData | null>;

  update(
    id: UUID,
    data: Partial<Omit<BulkSourceData, "id" | "createdAt" | "updatedAt">>,
    expectedUpdatedAt?: Date
  ): Promise<BulkSourceData>;

  list(
    filter: ListBulkSourcesFilter,
    page: number,
    pageSize: number
  ): Promise<ListBulkSourcesResult>;
}
