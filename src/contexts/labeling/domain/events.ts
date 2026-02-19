import type { TypedDomainEvent } from "@/lib/events/DomainEvent";

export type LabelTaskCreatedPayload = {
	label_task_id: string;
	candidate_id: string;
	rubric_id: string;
	rubric_version: number;
	scenario_type_id: string;
};
export type LabelTaskCreatedEvent = TypedDomainEvent<
	"label_task.created",
	LabelTaskCreatedPayload
>;

export type LabelSubmittedPayload = {
	label_id: string;
	label_task_id: string;
	annotator_id: string;
	label_type: string;
};
export type LabelSubmittedEvent = TypedDomainEvent<
	"label.submitted",
	LabelSubmittedPayload
>;

export type AdjudicationTriggeredPayload = {
	label_task_id: string;
	candidate_id: string;
	disagreement_metric: number;
	conflicting_label_ids: string[];
};
export type AdjudicationTriggeredEvent = TypedDomainEvent<
	"adjudication.triggered",
	AdjudicationTriggeredPayload
>;

export type LabelTaskFinalizedPayload = {
	label_task_id: string;
	candidate_id: string;
	final_label_id: string;
	label_distribution: Record<string, number>;
	agreement_score: number;
};
export type LabelTaskFinalizedEvent = TypedDomainEvent<
	"label_task.finalized",
	LabelTaskFinalizedPayload
>;

export type LabelTaskCancelledPayload = {
	label_task_id: string;
	candidate_id: string;
	cancelled_from_state: string;
	reason?: string;
};
export type LabelTaskCancelledEvent = TypedDomainEvent<
	"label_task.cancelled",
	LabelTaskCancelledPayload
>;
