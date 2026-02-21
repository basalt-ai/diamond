import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";
import { markSetupComplete } from "@/lib/system/readiness";

export const POST = withApiMiddleware(async () => {
  await markSetupComplete();
  return ok({ completed: true });
});
