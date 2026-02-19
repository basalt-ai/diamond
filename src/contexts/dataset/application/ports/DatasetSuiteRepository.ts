import type { UUID } from "@/shared/types";

import type { DatasetSuiteData } from "../../domain/entities/DatasetSuite";

export interface ListSuitesResult {
  data: DatasetSuiteData[];
  total: number;
}

export interface DatasetSuiteRepository {
  create(params: {
    name: string;
    description: string;
  }): Promise<DatasetSuiteData>;
  findById(id: UUID): Promise<DatasetSuiteData | null>;
  findByName(name: string): Promise<DatasetSuiteData | null>;
  list(page: number, pageSize: number): Promise<ListSuitesResult>;
}
