import { ApiError } from "@/lib/api/errors";
import { eventBus } from "@/lib/events/InProcessEventBus";
import { generateId } from "@/shared/ids";
import type { UUID } from "@/shared/types";

import {
  AGREEMENT_THRESHOLDS,
  computeAgreement,
  computeLabelDistribution,
} from "../../domain/agreement";
import type { LabelData } from "../../domain/entities/Label";
import { LabelTask, type LabelTaskData } from "../../domain/entities/LabelTask";
import { LabelTaskNotFoundError } from "../../domain/errors";
import type { LabelType } from "../../domain/value-objects/LabelValue";
import { validateLabelValue } from "../../domain/value-objects/LabelValue";
import type { LabelRepository } from "../ports/LabelRepository";
import type { LabelTaskRepository } from "../ports/LabelTaskRepository";

export class ManageLabels {
  constructor(
    private readonly labelRepo: LabelRepository,
    private readonly taskRepo: LabelTaskRepository
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
      throw new ApiError(
        409,
        "INVALID_STATE",
        `LabelTask is in state ${task.state}, expected in_progress`
      );
    }

    // Validate label value against type-specific schema
    const validatedValue = validateLabelValue(input.label_type, input.value);

    // Handle versioning: mark previous labels from same annotator as not current
    await this.labelRepo.markPreviousVersionsNotCurrent(taskId, annotatorId);

    // Determine version number
    const existingLabels = await this.labelRepo.getCurrentByTaskId(taskId);
    const previousFromAnnotator = existingLabels.filter(
      (l) => l.annotatorId === annotatorId
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

    // Transition task to review
    await this.taskRepo.update(taskId, {
      state: "review",
      updatedAt: new Date(),
    } as Partial<LabelTaskData>);

    // Check if we have enough labels for agreement evaluation
    const currentLabels = await this.labelRepo.getCurrentByTaskId(taskId);
    if (currentLabels.length >= task.labelsRequired) {
      await this.evaluateAgreement(task, currentLabels, input.label_type);
    }

    return created;
  }

  private async evaluateAgreement(
    task: LabelTaskData,
    labels: LabelData[],
    labelType: LabelType
  ): Promise<void> {
    const agreementScore = computeAgreement(labels, labelType);
    const threshold = AGREEMENT_THRESHOLDS[labelType];

    if (agreementScore >= threshold) {
      // Agreement OK — finalize with highest confidence label
      const finalLabel = labels.reduce((best, l) =>
        l.confidence > best.confidence ? l : best
      );

      const aggregate = new LabelTask(task);
      // Task is currently in review from the transition above
      aggregate.finalize(finalLabel.id);

      const taskData = aggregate.toData();
      await this.taskRepo.update(task.id, {
        state: taskData.state,
        finalLabelId: taskData.finalLabelId,
        updatedAt: taskData.updatedAt,
      } as Partial<LabelTaskData>);

      const distribution = computeLabelDistribution(labels, labelType);

      // Emit label_task.finalized event
      await eventBus.publish({
        eventId: generateId(),
        eventType: "label_task.finalized",
        aggregateId: task.id,
        occurredAt: new Date(),
        payload: {
          label_task_id: task.id,
          candidate_id: task.candidateId,
          final_label_id: finalLabel.id,
          label_distribution: distribution,
          agreement_score: agreementScore,
        },
      });
    } else {
      // Disagreement — move to adjudication
      await this.taskRepo.update(task.id, {
        state: "adjudication",
        updatedAt: new Date(),
      } as Partial<LabelTaskData>);

      await eventBus.publish({
        eventId: generateId(),
        eventType: "adjudication.triggered",
        aggregateId: task.id,
        occurredAt: new Date(),
        payload: {
          label_task_id: task.id,
          candidate_id: task.candidateId,
          disagreement_metric: agreementScore,
          conflicting_label_ids: labels.map((l) => l.id),
        },
      });
    }
  }

  async listByTaskId(
    taskId: UUID,
    page: number,
    pageSize: number,
    includeHistory = false
  ): Promise<{ data: LabelData[]; total: number }> {
    if (includeHistory) {
      return this.labelRepo.listByTaskId(taskId, page, pageSize);
    }
    // Default: current versions only
    const current = await this.labelRepo.getCurrentByTaskId(taskId);
    return { data: current, total: current.length };
  }
}
