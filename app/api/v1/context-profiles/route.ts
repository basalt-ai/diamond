import { NextRequest } from "next/server";
import { z } from "zod";

import { manageContextProfiles } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { created, paginated } from "@/lib/api/response";
import { parseBody } from "@/lib/api/validate";

const createSchema = z.object({
  name: z.string().min(1).max(255),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withApiMiddleware(async (req: NextRequest) => {
  const input = await parseBody(req, createSchema);
  const result = await manageContextProfiles.create(input);
  return created(result);
});

export const GET = withApiMiddleware(async () => {
  const result = await manageContextProfiles.list();
  return paginated(result, result.length, 1, result.length || 20);
});
