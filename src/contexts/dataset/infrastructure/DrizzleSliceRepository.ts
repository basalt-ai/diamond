import { eq } from "drizzle-orm";

import type { Database } from "@/db";
import { dsSlices } from "@/db/schema/dataset";
import type { UUID } from "@/shared/types";

import type { SliceRepository } from "../application/ports/SliceRepository";
import type { SliceData } from "../domain/entities/Slice";

export class DrizzleSliceRepository implements SliceRepository {
  constructor(private readonly db: Database) {}

  async findById(id: UUID): Promise<SliceData | null> {
    const [row] = await this.db
      .select()
      .from(dsSlices)
      .where(eq(dsSlices.id, id));
    return (row as unknown as SliceData) ?? null;
  }

  async updateGolden(
    id: UUID,
    isGolden: boolean,
    lockedAt: Date | null
  ): Promise<SliceData> {
    const [row] = await this.db
      .update(dsSlices)
      .set({ isGolden, lockedAt })
      .where(eq(dsSlices.id, id))
      .returning();
    return row as unknown as SliceData;
  }
}
