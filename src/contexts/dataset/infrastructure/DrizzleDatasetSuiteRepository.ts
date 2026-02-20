import { count, desc, eq, isNotNull, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { dsDatasetSuites } from "@/db/schema/dataset";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type {
  DatasetSuiteRepository,
  ListSuitesResult,
} from "../application/ports/DatasetSuiteRepository";
import type { DatasetSuiteData } from "../domain/entities/DatasetSuite";
import type { RefreshPolicyData } from "../domain/value-objects/RefreshPolicy";

export class DrizzleDatasetSuiteRepository implements DatasetSuiteRepository {
  constructor(private readonly db: Database) {}

  async create(params: {
    name: string;
    description: string;
  }): Promise<DatasetSuiteData> {
    const id = generateId();
    const [row] = await this.db
      .insert(dsDatasetSuites)
      .values({
        id,
        name: params.name,
        description: params.description,
      })
      .returning();
    return row as DatasetSuiteData;
  }

  async findById(id: UUID): Promise<DatasetSuiteData | null> {
    const [row] = await this.db
      .select()
      .from(dsDatasetSuites)
      .where(eq(dsDatasetSuites.id, id));
    return (row as DatasetSuiteData) ?? null;
  }

  async findByName(name: string): Promise<DatasetSuiteData | null> {
    const [row] = await this.db
      .select()
      .from(dsDatasetSuites)
      .where(eq(dsDatasetSuites.name, name));
    return (row as DatasetSuiteData) ?? null;
  }

  async list(page: number, pageSize: number): Promise<ListSuitesResult> {
    const [totalResult] = await this.db
      .select({ value: count() })
      .from(dsDatasetSuites);
    const total = totalResult?.value ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select()
      .from(dsDatasetSuites)
      .orderBy(desc(dsDatasetSuites.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { data: rows as DatasetSuiteData[], total };
  }

  async updateRefreshPolicy(
    id: UUID,
    policy: RefreshPolicyData | null
  ): Promise<DatasetSuiteData> {
    const [row] = await this.db
      .update(dsDatasetSuites)
      .set({
        refreshPolicy: policy,
        updatedAt: new Date(),
      })
      .where(eq(dsDatasetSuites.id, id))
      .returning();
    return row as DatasetSuiteData;
  }

  async findWithAutoRefreshEnabled(): Promise<DatasetSuiteData[]> {
    const rows = await this.db
      .select()
      .from(dsDatasetSuites)
      .where(
        sql`${dsDatasetSuites.refreshPolicy} IS NOT NULL AND (${dsDatasetSuites.refreshPolicy}->>'enabled')::boolean = true`
      );
    return rows as DatasetSuiteData[];
  }
}
