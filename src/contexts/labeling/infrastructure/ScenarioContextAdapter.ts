import { manageRubrics } from "@/contexts/scenario";
import { NotFoundError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import type { RubricReader } from "../application/ports/RubricReader";

export class ScenarioContextAdapter implements RubricReader {
  async getByIdAndVersion(
    rubricId: UUID,
    version: number
  ): Promise<{ id: UUID; version: number; criteria: unknown } | null> {
    try {
      const rubric = await manageRubrics.getById(rubricId);
      if (rubric.version !== version) return null;
      return {
        id: rubric.id,
        version: rubric.version,
        criteria: rubric.criteria,
      };
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async getLatestVersion(
    rubricId: UUID
  ): Promise<{ id: UUID; version: number } | null> {
    try {
      const rubric = await manageRubrics.getById(rubricId);
      return { id: rubric.id, version: rubric.version };
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }
}
