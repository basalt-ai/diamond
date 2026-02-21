import { withAuthMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";

export const GET = withAuthMiddleware(async (_req, _ctx, user) => {
  return ok(user);
});
