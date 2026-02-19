import { NextRequest } from "next/server";
import { z } from "zod";

import { manageLabelTasks } from "@/contexts/labeling";
import { LABEL_TASK_STATES } from "@/contexts/labeling/domain/entities/LabelTask";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody, parseQuery } from "@/lib/api/validate";
import type { UUID } from "@/shared/types";

const createSchema = z.object({
	candidate_id: z.string().uuid(),
	rubric_id: z.string().uuid(),
});

const listSchema = z.object({
	state: z.enum(LABEL_TASK_STATES).optional(),
	assigned_to: z.string().uuid().optional(),
	candidate_id: z.string().uuid().optional(),
	scenario_type_id: z.string().uuid().optional(),
	page: z.coerce.number().int().positive().default(1),
	page_size: z.coerce.number().int().positive().max(100).default(50),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
	const input = await parseBody(req, createSchema);
	const result = await manageLabelTasks.create(input);
	return created(result);
});

export const GET = withApiMiddleware(async (req: NextRequest) => {
	const query = parseQuery(req, listSchema);
	const filter = {
		state: query.state,
		assignedTo: query.assigned_to as UUID | undefined,
		candidateId: query.candidate_id as UUID | undefined,
		scenarioTypeId: query.scenario_type_id as UUID | undefined,
	};
	const { data, total } = await manageLabelTasks.list(
		filter,
		query.page,
		query.page_size,
	);
	return paginated(data, total, query.page, query.page_size);
});
