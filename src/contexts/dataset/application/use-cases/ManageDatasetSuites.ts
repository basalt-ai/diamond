import { DuplicateError, NotFoundError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type { DatasetSuiteData } from "../../domain/entities/DatasetSuite";
import type {
  DatasetSuiteRepository,
  ListSuitesResult,
} from "../ports/DatasetSuiteRepository";

export class ManageDatasetSuites {
  constructor(private readonly repo: DatasetSuiteRepository) {}

  async create(input: {
    name: string;
    description?: string;
  }): Promise<DatasetSuiteData> {
    const existing = await this.repo.findByName(input.name);
    if (existing) {
      throw new DuplicateError("DatasetSuite", "name", input.name);
    }

    return this.repo.create({
      name: input.name,
      description: input.description ?? "",
    });
  }

  async get(id: UUID): Promise<DatasetSuiteData> {
    const suite = await this.repo.findById(id);
    if (!suite) {
      throw new NotFoundError("DatasetSuite", id);
    }
    return suite;
  }

  async list(page: number, pageSize: number): Promise<ListSuitesResult> {
    return this.repo.list(page, pageSize);
  }
}
