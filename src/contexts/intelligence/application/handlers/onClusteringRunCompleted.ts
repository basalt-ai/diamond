import type { DomainEvent } from "@/lib/events/DomainEvent";
import type { UUID } from "@/shared/types";

export async function onClusteringRunCompleted(
  event: DomainEvent
): Promise<void> {
  const { clustering_run_id } = event.payload as {
    clustering_run_id: string;
  };

  try {
    const { induceScenarios } = await import("@/contexts/intelligence");
    await induceScenarios.execute(clustering_run_id as UUID);
  } catch (err) {
    // Log but don't propagate — induction failure shouldn't fail the clustering run
    console.error(
      `[onClusteringRunCompleted] Induction failed for run ${clustering_run_id}:`,
      err
    );
  }
}
