import { and, desc, eq, sql } from "drizzle-orm";

import type { Database } from "@/db";
import { scRubrics } from "@/db/schema/scenario";
import { NotFoundError } from "@/lib/domain/DomainError";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { RubricRepository } from "../application/ports/RubricRepository";
import type { CreateRubricInput, RubricData } from "../domain/entities/Rubric";

export class DrizzleRubricRepository implements RubricRepository {
  constructor(private readonly db: Database) {}

  async createVersion(input: CreateRubricInput): Promise<RubricData> {
    const id = generateId();

    // Get next version number atomically
    const [maxRow] = await this.db
      .select({
        maxVersion: sql<number>`coalesce(max(${scRubrics.version}), 0)`,
      })
      .from(scRubrics)
      .where(eq(scRubrics.scenarioTypeId, input.scenarioTypeId));
    const nextVersion = (maxRow?.maxVersion ?? 0) + 1;

    const [row] = await this.db
      .insert(scRubrics)
      .values({
        id,
        scenarioTypeId: input.scenarioTypeId,
        version: nextVersion,
        criteria: input.criteria,
        examples: input.examples ?? [],
      })
      .returning();
    if (!row) throw new Error("Failed to create Rubric version");
    return row as unknown as RubricData;
  }

  async getLatest(scenarioTypeId: UUID): Promise<RubricData> {
    const [row] = await this.db
      .select()
      .from(scRubrics)
      .where(eq(scRubrics.scenarioTypeId, scenarioTypeId))
      .orderBy(desc(scRubrics.version))
      .limit(1);
    if (!row) throw new NotFoundError("Rubric", scenarioTypeId);
    return row as unknown as RubricData;
  }

  async getByVersion(
    scenarioTypeId: UUID,
    version: number
  ): Promise<RubricData> {
    const [row] = await this.db
      .select()
      .from(scRubrics)
      .where(
        and(
          eq(scRubrics.scenarioTypeId, scenarioTypeId),
          eq(scRubrics.version, version)
        )
      );
    if (!row) {
      throw new NotFoundError(
        "Rubric",
        `${scenarioTypeId}@v${String(version)}`
      );
    }
    return row as unknown as RubricData;
  }

  async listVersions(scenarioTypeId: UUID): Promise<RubricData[]> {
    const rows = await this.db
      .select()
      .from(scRubrics)
      .where(eq(scRubrics.scenarioTypeId, scenarioTypeId))
      .orderBy(desc(scRubrics.version));
    return rows as unknown as RubricData[];
  }

  async getById(id: UUID): Promise<RubricData> {
    const [row] = await this.db
      .select()
      .from(scRubrics)
      .where(eq(scRubrics.id, id));
    if (!row) throw new NotFoundError("Rubric", id);
    return row as unknown as RubricData;
  }
}
