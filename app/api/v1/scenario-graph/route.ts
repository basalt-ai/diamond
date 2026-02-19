import { readScenarioGraph } from "@/contexts/scenario";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async () => {
  const result = await readScenarioGraph.getCurrent();
  return ok(result);
});
