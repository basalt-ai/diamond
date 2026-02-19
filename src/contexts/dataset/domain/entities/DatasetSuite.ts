import type { UUID } from "@/shared/types";

export interface DatasetSuiteData {
  id: UUID;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}
