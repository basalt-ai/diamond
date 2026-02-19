import type { UUID } from "@/shared/types";

export interface AdjudicationRecord {
  adjudicator_id: UUID;
  resolution_type: "selected_existing" | "submitted_new";
  selected_label_id?: UUID;
  new_label_id?: UUID;
  disagreement_metric: number;
  conflicting_label_ids: UUID[];
  rationale: string;
  resolved_at: Date;
}
