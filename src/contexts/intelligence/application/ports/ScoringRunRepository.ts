import type { UUID } from "@/shared/types";

import type { ScoringRun } from "../../domain/entities/ScoringRun";

export interface ScoringRunRepository {
  save(run: ScoringRun): Promise<void>;
  findById(id: UUID): Promise<ScoringRun | null>;
  findActive(): Promise<ScoringRun | null>;
  list(options?: { limit?: number; offset?: number }): Promise<ScoringRun[]>;
}
