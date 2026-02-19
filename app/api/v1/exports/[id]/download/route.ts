import { manageExports } from "@/contexts/export";
import { withApiMiddleware } from "@/lib/api/middleware";
import type { UUID } from "@/shared/types";

export const GET = withApiMiddleware(async (_req, ctx) => {
  const { id } = await ctx.params;
  const { stream, filename, contentType } =
    await manageExports.getArtifactStream(id as UUID);
  return new Response(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
