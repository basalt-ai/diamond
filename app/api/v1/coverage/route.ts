import { coverageComputer } from "@/contexts/intelligence";
import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";

export const GET = withApiMiddleware(async () => {
  const report = await coverageComputer.compute();
  return ok(report);
});
