import { NextRequest } from "next/server";
import { z } from "zod";

import { manageFailureModes } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageFailureModes.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async () => {
  const result = await manageFailureModes.list();
  return ok(result);
});
