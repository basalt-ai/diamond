import type { UUID } from "@/shared/types";

import type { SelectionRun } from "../../domain/entities/SelectionRun";

export interface SelectionRunRepository {
  save(run: SelectionRun): Promise<void>;
  findById(id: UUID): Promise<SelectionRun | null>;
  findActive(): Promise<SelectionRun | null>;
  list(options?: { limit?: number; offset?: number }): Promise<SelectionRun[]>;
}
