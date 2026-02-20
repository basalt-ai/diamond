import { NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { SliceData } from "../../domain/entities/Slice";
import { GoldenSliceImmutableError } from "../../domain/errors";
import type { SliceRepository } from "../ports/SliceRepository";

export class ManageSlices {
  constructor(private readonly sliceRepo: SliceRepository) {}

  async setGolden(
    sliceId: UUID,
    golden: boolean,
    force?: boolean
  ): Promise<SliceData> {
    const slice = await this.sliceRepo.findById(sliceId);
    if (!slice) {
      throw new NotFoundError("Slice", sliceId);
    }

    if (golden) {
      // Mark as golden: set is_golden=true, locked_at=now()
      const lockedAt = new Date();
      const updated = await this.sliceRepo.updateGolden(
        sliceId,
        true,
        lockedAt
      );

      await eventBus.publish({
        eventId: generateId(),
        eventType: "golden_slice.locked",
        aggregateId: sliceId,
        occurredAt: lockedAt,
        payload: {
          slice_id: sliceId,
          dataset_version_id: slice.datasetVersionId,
          slice_name: slice.name,
        },
      });

      return updated;
    }

    // Unmarking golden: require force flag
    if (!force) {
      throw new GoldenSliceImmutableError(sliceId);
    }

    return this.sliceRepo.updateGolden(sliceId, false, null);
  }
}
