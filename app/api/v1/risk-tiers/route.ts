import { NextRequest } from "next/server";
import { z } from "zod";

import { manageRiskTiers } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, ok } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  weight: z.number().gt(0).lte(1),
  category: z.enum(["business", "safety", "compliance"]),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageRiskTiers.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async () => {
  const result = await manageRiskTiers.list();
  return ok(result);
});
