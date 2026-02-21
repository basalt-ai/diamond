import type { UUID } from "@/shared/types";

import type { RefreshPolicyData } from "../value-objects/RefreshPolicy";

export interface DatasetSuiteData {
  id: UUID;
  name: string;
  description: string;
  scenarioTypeId: UUID;
  refreshPolicy: RefreshPolicyData | null;
  createdAt: Date;
  updatedAt: Date;
}
