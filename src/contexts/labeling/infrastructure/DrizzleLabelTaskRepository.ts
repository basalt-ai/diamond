import { and, count, desc, eq } from "drizzle-orm";

import type { Database } from "@/db";
import { lbLabelTasks } from "@/db/schema/labeling";
import type { UUID } from "@/shared/types";

import type {
  LabelTaskRepository,
  ListLabelTasksFilter,
} from "../application/ports/LabelTaskRepository";
import type { LabelTaskData } from "../domain/entities/LabelTask";

export class DrizzleLabelTaskRepository implements LabelTaskRepository {
  constructor(private readonly db: Database) {}

  async insert(data: LabelTaskData): Promise<LabelTaskData> {
    const [row] = await this.db
      .insert(lbLabelTasks)
      .values({
        id: data.id,
        candidateId: data.candidateId,
        rubricId: data.rubricId,
        rubricVersion: data.rubricVersion,
        scenarioTypeId: data.scenarioTypeId,
        assignedTo: data.assignedTo,
        state: data.state,
        preLabel: data.preLabel,
        adjudicationRecord: data.adjudicationRecord,
        finalLabelId: data.finalLabelId,
        labelsRequired: data.labelsRequired,
      })
      .returning();
    return row as LabelTaskData;
  }

  async findById(id: UUID): Promise<LabelTaskData | null> {
    const [row] = await this.db
      .select()
      .from(lbLabelTasks)
      .where(eq(lbLabelTasks.id, id));
    return (row as LabelTaskData) ?? null;
  }

  async update(
    id: UUID,
    updates: Partial<LabelTaskData>
  ): Promise<LabelTaskData> {
    const setValues: Record<string, unknown> = {};
    if (updates.state !== undefined) setValues.state = updates.state;
    if (updates.assignedTo !== undefined)
      setValues.assignedTo = updates.assignedTo;
    if (updates.adjudicationRecord !== undefined)
      setValues.adjudicationRecord = updates.adjudicationRecord;
    if (updates.finalLabelId !== undefined)
      setValues.finalLabelId = updates.finalLabelId;
    setValues.updatedAt = new Date();

    const [row] = await this.db
      .update(lbLabelTasks)
      .set(setValues)
      .where(eq(lbLabelTasks.id, id))
      .returning();
    return row as LabelTaskData;
  }

  async list(
    filter: ListLabelTasksFilter,
    page: number,
    pageSize: number
  ): Promise<{ data: LabelTaskData[]; total: number }> {
    const conditions = [];

    if (filter.state) {
      conditions.push(eq(lbLabelTasks.state, filter.state));
    }
    if (filter.assignedTo) {
      conditions.push(eq(lbLabelTasks.assignedTo, filter.assignedTo));
    }
    if (filter.candidateId) {
      conditions.push(eq(lbLabelTasks.candidateId, filter.candidateId));
    }
    if (filter.scenarioTypeId) {
      conditions.push(eq(lbLabelTasks.scenarioTypeId, filter.scenarioTypeId));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await this.db
      .select({ value: count() })
      .from(lbLabelTasks)
      .where(where);
    const total = totalResult?.value ?? 0;

    const offset = (page - 1) * pageSize;
    const rows = await this.db
      .select()
      .from(lbLabelTasks)
      .where(where)
      .orderBy(desc(lbLabelTasks.createdAt))
      .limit(pageSize)
      .offset(offset);

    return { data: rows as LabelTaskData[], total };
  }
}
