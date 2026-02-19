import { DuplicateError, NotFoundError } from "@/lib/domain/DomainError";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import { computeAgreement, computeLabelDistribution } from "../../domain/agreement";
import {
	LabelTask,
	type LabelTaskData,
	type LabelTaskState,
} from "../../domain/entities/LabelTask";
import { LabelTaskNotFoundError } from "../../domain/errors";
import type { LabelType } from "../../domain/value-objects/LabelValue";
import type { AdjudicationRecord } from "../../domain/value-objects/AdjudicationRecord";
import type { CandidateReader } from "../ports/CandidateReader";
import type { LabelRepository } from "../ports/LabelRepository";
import type {
	LabelTaskRepository,
	ListLabelTasksFilter,
} from "../ports/LabelTaskRepository";
import type { RubricReader } from "../ports/RubricReader";

export class ManageLabelTasks {
	constructor(
		private readonly taskRepo: LabelTaskRepository,
		private readonly labelRepo: LabelRepository,
		private readonly rubricReader: RubricReader,
		private readonly candidateReader: CandidateReader,
	) {}

	async create(input: {
		candidate_id: string;
		rubric_id: string;
	}): Promise<LabelTaskData> {
		const candidateId = input.candidate_id as UUID;
		const rubricId = input.rubric_id as UUID;

		// Validate candidate exists and is in selected state
		const candidate = await this.candidateReader.get(candidateId);
		if (!candidate) {
			throw new NotFoundError("Candidate", candidateId);
		}
		if (candidate.state !== "selected") {
			throw new DuplicateError(
				"LabelTask",
				"candidate_id",
				candidateId,
			);
		}

		// Fetch rubric to pin version
		const rubric = await this.rubricReader.getLatestVersion(rubricId);
		if (!rubric) {
			throw new NotFoundError("Rubric", rubricId);
		}

		const id = generateId();
		const now = new Date();

		const data: LabelTaskData = {
			id,
			candidateId,
			rubricId: rubric.id,
			rubricVersion: rubric.version,
			scenarioTypeId: candidate.scenario_type_id,
			assignedTo: null,
			state: "pending",
			preLabel: null,
			adjudicationRecord: null,
			finalLabelId: null,
			labelsRequired: 2,
			createdAt: now,
			updatedAt: now,
		};

		const created = await this.taskRepo.insert(data);

		await eventBus.publish({
			eventId: generateId(),
			eventType: "label_task.created",
			aggregateId: id,
			occurredAt: now,
			payload: {
				label_task_id: id,
				candidate_id: candidateId,
				rubric_id: rubric.id,
				rubric_version: rubric.version,
				scenario_type_id: candidate.scenario_type_id,
			},
		});

		return created;
	}

	async get(id: UUID): Promise<LabelTaskData> {
		const task = await this.taskRepo.findById(id);
		if (!task) {
			throw new LabelTaskNotFoundError(id);
		}
		return task;
	}

	async list(
		filter: ListLabelTasksFilter,
		page: number,
		pageSize: number,
	): Promise<{ data: LabelTaskData[]; total: number }> {
		return this.taskRepo.list(filter, page, pageSize);
	}

	async transition(
		id: UUID,
		targetState: LabelTaskState,
		metadata?: {
			assigned_to?: string;
			reason?: string;
			adjudication_record?: AdjudicationRecord;
		},
	): Promise<LabelTaskData> {
		const data = await this.taskRepo.findById(id);
		if (!data) {
			throw new LabelTaskNotFoundError(id);
		}

		const task = new LabelTask(data);

		if (targetState === "cancelled") {
			task.cancel(metadata?.reason);
		} else if (
			targetState === "in_progress" &&
			metadata?.assigned_to
		) {
			task.assign(metadata.assigned_to as UUID);
		} else if (
			targetState === "finalized" &&
			data.state === "adjudication" &&
			metadata?.adjudication_record
		) {
			const record = metadata.adjudication_record;
			const finalLabelId =
				record.resolution_type === "selected_existing"
					? record.selected_label_id!
					: record.new_label_id!;
			task.finalize(finalLabelId, record);
		} else {
			task.transitionTo(targetState);
		}

		const taskData = task.toData();
		const updated = await this.taskRepo.update(id, {
			state: taskData.state,
			assignedTo: taskData.assignedTo,
			adjudicationRecord: taskData.adjudicationRecord,
			finalLabelId: taskData.finalLabelId,
			updatedAt: taskData.updatedAt,
		} as Partial<LabelTaskData>);

		await eventBus.publishAll(task.domainEvents);

		// Emit label_task.finalized when resolving adjudication
		if (
			targetState === "finalized" &&
			data.state === "adjudication" &&
			taskData.finalLabelId
		) {
			const labels = await this.labelRepo.getCurrentByTaskId(id);
			const labelType = labels[0]?.labelType as LabelType | undefined;
			const agreementScore = labelType
				? computeAgreement(labels, labelType)
				: 0;
			const distribution = labelType
				? computeLabelDistribution(labels, labelType)
				: {};

			await eventBus.publish({
				eventId: generateId(),
				eventType: "label_task.finalized",
				aggregateId: id,
				occurredAt: new Date(),
				payload: {
					label_task_id: id,
					candidate_id: data.candidateId,
					final_label_id: taskData.finalLabelId,
					label_distribution: distribution,
					agreement_score: agreementScore,
				},
			});
		}

		return updated;
	}

	async getWithLabels(
		id: UUID,
	): Promise<LabelTaskData & { labels: unknown[] }> {
		const task = await this.get(id);
		const labels = await this.labelRepo.getCurrentByTaskId(id);
		return { ...task, labels };
	}
}
