export const QUEUES = {
  EMBEDDING_COMPUTE: "embedding.compute",
  EMBEDDING_DLQ: "embedding.dlq",
  SCORING_COMPUTE: "scoring.compute",
  SCORING_DLQ: "scoring.dlq",
  SCORING_RUN: "scoring_run.execute",
  SELECTION_RUN: "selection_run.execute",
  CLUSTER_DETECT: "cluster.detect",
  LABELING_CREATE: "labeling.create_tasks",
} as const;
