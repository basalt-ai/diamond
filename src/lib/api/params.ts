import type { UUID } from "@/shared/types";

import { ApiError } from "./errors";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseUUID(value: string | undefined, paramName = "id"): UUID {
  if (!value || !UUID_RE.test(value)) {
    throw new ApiError(
      400,
      "INVALID_PARAM",
      `Parameter "${paramName}" must be a valid UUID, got "${value}"`
    );
  }
  return value as UUID;
}
