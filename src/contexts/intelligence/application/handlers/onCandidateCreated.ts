import type { DomainEvent } from "@/lib/events/DomainEvent";
import { getJobClient } from "@/lib/jobs/client";
import { QUEUES } from "@/lib/jobs/queues";

export async function onCandidateCreated(event: DomainEvent): Promise<void> {
  const candidateId = event.payload.candidate_id as string;

  const queue = await getJobClient();
  await queue.send(
    QUEUES.EMBEDDING_COMPUTE,
    { candidateId },
    { singletonKey: `embed-${candidateId}` }
  );
}
