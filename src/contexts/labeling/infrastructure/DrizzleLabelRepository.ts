import { and, count, desc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { lbLabels } from "@/db/schema/labeling";
import type { UUID } from "@/shared/types";

import type { LabelRepository } from "../application/ports/LabelRepository";
import type { LabelData } from "../domain/entities/Label";

export class DrizzleLabelRepository implements LabelRepository {
	constructor(private readonly db: Database) {}

	async insert(data: LabelData): Promise<LabelData> {
		const [row] = await this.db
			.insert(lbLabels)
			.values({
				id: data.id,
				labelTaskId: data.labelTaskId,
				annotatorId: data.annotatorId,
				labelType: data.labelType,
				value: data.value,
				confidence: data.confidence,
				rationale: data.rationale,
				version: data.version,
				isCurrent: data.isCurrent,
			})
			.returning();
		return row as LabelData;
	}

	async findById(id: UUID): Promise<LabelData | null> {
		const [row] = await this.db
			.select()
			.from(lbLabels)
			.where(eq(lbLabels.id, id));
		return (row as LabelData) ?? null;
	}

	async listByTaskId(
		taskId: UUID,
		page: number,
		pageSize: number,
	): Promise<{ data: LabelData[]; total: number }> {
		const where = eq(lbLabels.labelTaskId, taskId);

		const [totalResult] = await this.db
			.select({ value: count() })
			.from(lbLabels)
			.where(where);
		const total = totalResult?.value ?? 0;

		const offset = (page - 1) * pageSize;
		const rows = await this.db
			.select()
			.from(lbLabels)
			.where(where)
			.orderBy(desc(lbLabels.createdAt))
			.limit(pageSize)
			.offset(offset);

		return { data: rows as LabelData[], total };
	}

	async countByTaskId(taskId: UUID): Promise<number> {
		const [result] = await this.db
			.select({ value: count() })
			.from(lbLabels)
			.where(
				and(eq(lbLabels.labelTaskId, taskId), eq(lbLabels.isCurrent, true)),
			);
		return result?.value ?? 0;
	}

	async getCurrentByTaskId(taskId: UUID): Promise<LabelData[]> {
		const rows = await this.db
			.select()
			.from(lbLabels)
			.where(
				and(eq(lbLabels.labelTaskId, taskId), eq(lbLabels.isCurrent, true)),
			)
			.orderBy(desc(lbLabels.createdAt));
		return rows as LabelData[];
	}

	async markPreviousVersionsNotCurrent(
		taskId: UUID,
		annotatorId: UUID,
	): Promise<void> {
		await this.db
			.update(lbLabels)
			.set({ isCurrent: false })
			.where(
				and(
					eq(lbLabels.labelTaskId, taskId),
					eq(lbLabels.annotatorId, annotatorId),
					eq(lbLabels.isCurrent, true),
				),
			);
	}
}
