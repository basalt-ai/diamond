import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import type { LabelData } from "../../domain/entities/Label";
import { LabelTaskNotFoundError } from "../../domain/errors";
import type { LabelType } from "../../domain/value-objects/LabelValue";
import { validateLabelValue } from "../../domain/value-objects/LabelValue";
import type { LabelRepository } from "../ports/LabelRepository";
import type { LabelTaskRepository } from "../ports/LabelTaskRepository";

export class ManageLabels {
	constructor(
		private readonly labelRepo: LabelRepository,
		private readonly taskRepo: LabelTaskRepository,
	) {}

	async submit(input: {
		label_task_id: string;
		annotator_id: string;
		label_type: LabelType;
		value: unknown;
		confidence: number;
		rationale?: string;
	}): Promise<LabelData> {
		const taskId = input.label_task_id as UUID;
		const annotatorId = input.annotator_id as UUID;

		// Validate task exists and is in in_progress state
		const task = await this.taskRepo.findById(taskId);
		if (!task) {
			throw new LabelTaskNotFoundError(taskId);
		}
		if (task.state !== "in_progress") {
			const { ApiError } = await import("@/lib/api/errors");
			throw new ApiError(
				409,
				"INVALID_STATE",
				`LabelTask is in state ${task.state}, expected in_progress`,
			);
		}

		// Validate label value against type-specific schema
		const validatedValue = validateLabelValue(input.label_type, input.value);

		// Handle versioning: mark previous labels from same annotator as not current
		await this.labelRepo.markPreviousVersionsNotCurrent(taskId, annotatorId);

		// Determine version number
		const existingLabels = await this.labelRepo.getCurrentByTaskId(taskId);
		const previousFromAnnotator = existingLabels.filter(
			(l) => l.annotatorId === annotatorId,
		);
		const version =
			previousFromAnnotator.length > 0
				? Math.max(...previousFromAnnotator.map((l) => l.version)) + 1
				: 1;

		const id = generateId();
		const label: LabelData = {
			id,
			labelTaskId: taskId,
			annotatorId,
			labelType: input.label_type,
			value: validatedValue,
			confidence: input.confidence,
			rationale: input.rationale ?? null,
			version,
			isCurrent: true,
			createdAt: new Date(),
		};

		const created = await this.labelRepo.insert(label);

		// Emit label.submitted event
		await eventBus.publish({
			eventId: generateId(),
			eventType: "label.submitted",
			aggregateId: taskId,
			occurredAt: new Date(),
			payload: {
				label_id: id,
				label_task_id: taskId,
				annotator_id: annotatorId,
				label_type: input.label_type,
			},
		});

		// Transition task to review if it's the first label
		if (task.state === "in_progress") {
			await this.taskRepo.update(taskId, {
				state: "review",
				updatedAt: new Date(),
			} as Partial<import("../../domain/entities/LabelTask").LabelTaskData>);
		}

		return created;
	}

	async listByTaskId(
		taskId: UUID,
		page: number,
		pageSize: number,
		includeHistory = false,
	): Promise<{ data: LabelData[]; total: number }> {
		if (includeHistory) {
			return this.labelRepo.listByTaskId(taskId, page, pageSize);
		}
		// Default: current versions only
		const current = await this.labelRepo.getCurrentByTaskId(taskId);
		return { data: current, total: current.length };
	}
}
