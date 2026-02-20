import { ApiError } from "./errors";

/**
 * Ensures only one run of a given type is active at a time.
 * Call `guard()` before creating a new run — it throws 429 if one is already active.
 * The `hasActiveRun` callback checks the database for pending/processing runs.
 */
export function createSingletonRunGuard(runType: string) {
  return async (hasActiveRun: () => Promise<boolean>): Promise<void> => {
    if (await hasActiveRun()) {
      throw new ApiError(
        429,
        "RUN_ALREADY_ACTIVE",
        `A ${runType} run is already pending or processing. Please wait for it to complete.`
      );
    }
  };
}

export const guardScoringRun = createSingletonRunGuard("scoring");
export const guardSelectionRun = createSingletonRunGuard("selection");
