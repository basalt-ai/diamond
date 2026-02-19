import { uuidv7 } from "uuidv7";

import type { UUID } from "./types";

export function generateId(): UUID {
  return uuidv7() as UUID;
}
