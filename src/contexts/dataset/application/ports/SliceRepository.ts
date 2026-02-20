import type { UUID } from "@/shared/types";

import type { SliceData } from "../../domain/entities/Slice";

export interface SliceRepository {
  findById(id: UUID): Promise<SliceData | null>;

  findByVersionId(versionId: UUID): Promise<SliceData[]>;

  updateGolden(
    id: UUID,
    isGolden: boolean,
    lockedAt: Date | null
  ): Promise<SliceData>;
}
