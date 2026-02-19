import { withApiMiddleware } from "@/lib/api/middleware";
import { ok } from "@/lib/api/response";

const HARDCODED_USER = {
  id: "019515a0-0000-7000-8000-000000000001",
  name: "Test User",
  email: "test@diamond.dev",
  role: "admin",
} as const;

export const GET = withApiMiddleware(async () => {
  return ok(HARDCODED_USER);
});
