import { AggregateRoot } from "@/lib/domain/AggregateRoot";
import { InvalidStateTransitionError } from "@/lib/domain/DomainError";
import type { UUID } from "@/shared/types";

import { TaskNotAssignableError } from "../errors";
import type { AdjudicationRecord } from "../value-objects/AdjudicationRecord";
import type { PreLabel } from "../value-objects/PreLabel";

export const LABEL_TASK_STATES = [
	"pending",
	"in_progress",
	"review",
	"adjudication",
	"finalized",
	"cancelled",
] as const;
export type LabelTaskState = (typeof LABEL_TASK_STATES)[number];

const VALID_TRANSITIONS: Record<LabelTaskState, LabelTaskState[]> = {
	pending: ["in_progress", "cancelled"],
	in_progress: ["review", "cancelled"],
	review: ["in_progress", "finalized", "adjudication", "cancelled"],
	adjudication: ["finalized", "cancelled"],
	finalized: [],
	cancelled: [],
};

export interface LabelTaskData {
	id: UUID;
	candidateId: UUID;
	rubricId: UUID;
	rubricVersion: number;
	scenarioTypeId: UUID;
	assignedTo: UUID | null;
	state: LabelTaskState;
	preLabel: PreLabel | null;
	adjudicationRecord: AdjudicationRecord | null;
	finalLabelId: UUID | null;
	labelsRequired: number;
	createdAt: Date;
	updatedAt: Date;
}

export class LabelTask extends AggregateRoot {
	private _candidateId: UUID;
	private _rubricId: UUID;
	private _rubricVersion: number;
	private _scenarioTypeId: UUID;
	private _assignedTo: UUID | null;
	private _state: LabelTaskState;
	private _preLabel: PreLabel | null;
	private _adjudicationRecord: AdjudicationRecord | null;
	private _finalLabelId: UUID | null;
	private _labelsRequired: number;
	private _createdAt: Date;
	private _updatedAt: Date;

	constructor(data: LabelTaskData) {
		super(data.id);
		this._candidateId = data.candidateId;
		this._rubricId = data.rubricId;
		this._rubricVersion = data.rubricVersion;
		this._scenarioTypeId = data.scenarioTypeId;
		this._assignedTo = data.assignedTo;
		this._state = data.state;
		this._preLabel = data.preLabel;
		this._adjudicationRecord = data.adjudicationRecord;
		this._finalLabelId = data.finalLabelId;
		this._labelsRequired = data.labelsRequired;
		this._createdAt = data.createdAt;
		this._updatedAt = data.updatedAt;
	}

	get candidateId(): UUID {
		return this._candidateId;
	}
	get rubricId(): UUID {
		return this._rubricId;
	}
	get rubricVersion(): number {
		return this._rubricVersion;
	}
	get scenarioTypeId(): UUID {
		return this._scenarioTypeId;
	}
	get assignedTo(): UUID | null {
		return this._assignedTo;
	}
	get state(): LabelTaskState {
		return this._state;
	}
	get preLabel(): PreLabel | null {
		return this._preLabel;
	}
	get adjudicationRecord(): AdjudicationRecord | null {
		return this._adjudicationRecord;
	}
	get finalLabelId(): UUID | null {
		return this._finalLabelId;
	}
	get labelsRequired(): number {
		return this._labelsRequired;
	}
	get createdAt(): Date {
		return this._createdAt;
	}
	get updatedAt(): Date {
		return this._updatedAt;
	}

	transitionTo(targetState: LabelTaskState): void {
		const allowed = VALID_TRANSITIONS[this._state];
		if (!allowed.includes(targetState)) {
			throw new InvalidStateTransitionError(
				"LabelTask",
				this._state,
				targetState,
			);
		}

		const fromState = this._state;
		this._state = targetState;
		this._updatedAt = new Date();

		this.addDomainEvent("label_task.state_changed", {
			label_task_id: this.id,
			candidate_id: this._candidateId,
			from_state: fromState,
			to_state: targetState,
		});
	}

	assign(annotatorId: UUID): void {
		if (this._state !== "pending" && this._state !== "review") {
			throw new TaskNotAssignableError(this.id, this._state);
		}

		this._assignedTo = annotatorId;
		this.transitionTo("in_progress");
	}

	cancel(reason?: string): void {
		const cancellableStates: LabelTaskState[] = [
			"pending",
			"in_progress",
			"review",
			"adjudication",
		];
		if (!cancellableStates.includes(this._state)) {
			throw new InvalidStateTransitionError(
				"LabelTask",
				this._state,
				"cancelled",
			);
		}

		const fromState = this._state;
		this._state = "cancelled";
		this._updatedAt = new Date();

		this.addDomainEvent("label_task.cancelled", {
			label_task_id: this.id,
			candidate_id: this._candidateId,
			cancelled_from_state: fromState,
			reason,
		});
	}

	finalize(finalLabelId: UUID, adjudicationRecord?: AdjudicationRecord): void {
		this._finalLabelId = finalLabelId;
		if (adjudicationRecord) {
			this._adjudicationRecord = adjudicationRecord;
		}
		this.transitionTo("finalized");
	}

	toData(): LabelTaskData {
		return {
			id: this.id,
			candidateId: this._candidateId,
			rubricId: this._rubricId,
			rubricVersion: this._rubricVersion,
			scenarioTypeId: this._scenarioTypeId,
			assignedTo: this._assignedTo,
			state: this._state,
			preLabel: this._preLabel,
			adjudicationRecord: this._adjudicationRecord,
			finalLabelId: this._finalLabelId,
			labelsRequired: this._labelsRequired,
			createdAt: this._createdAt,
			updatedAt: this._updatedAt,
		};
	}
}
