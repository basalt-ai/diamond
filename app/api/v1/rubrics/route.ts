import { NextRequest } from "next/server";
import { z } from "zod";

import { manageRubrics } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const criterionSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  weight: z.number().gte(0).lte(1),
});

const exampleSchema = z.object({
  input: z.string(),
  expectedOutput: z.string(),
  explanation: z.string(),
});

const createSchema = z.object({
  scenarioTypeId: z.string().uuid(),
  criteria: z.array(criterionSchema).min(1),
  examples: z.array(exampleSchema).optional(),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageRubrics.createVersion(input);
  return created(result);
});
