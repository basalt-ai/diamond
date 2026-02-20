#!/usr/bin/env python3
"""HDBSCAN clustering for candidate embeddings.

Reads embeddings as JSON from stdin, runs HDBSCAN, and outputs cluster
labels and representative IDs as JSON to stdout.

Input format:
{
  "embeddings": [[0.1, 0.2, ...], ...],
  "candidate_ids": ["uuid1", "uuid2", ...],
  "min_cluster_size": 5,
  "min_samples": 3
}

Output format:
{
  "clusters": [
    {
      "cluster_id": 0,
      "candidate_ids": ["uuid1", "uuid3"],
      "representative_ids": ["uuid1"],
      "size": 2
    }
  ],
  "noise_count": 5,
  "total": 100
}
"""

import json
import sys

import numpy as np
from sklearn.cluster import HDBSCAN


def main():
    data = json.load(sys.stdin)
    embeddings = np.array(data["embeddings"], dtype=np.float32)
    candidate_ids = data["candidate_ids"]
    min_cluster_size = data.get("min_cluster_size", 5)
    min_samples = data.get("min_samples", 3)

    if len(embeddings) < max(min_cluster_size, 15):
        # Too few points for meaningful clustering
        print(json.dumps({
            "clusters": [],
            "noise_count": len(embeddings),
            "total": len(embeddings),
        }))
        return

    clusterer = HDBSCAN(
        min_cluster_size=min_cluster_size,
        min_samples=min_samples,
        metric="euclidean",
    )
    labels = clusterer.fit_predict(embeddings)

    # Group candidates by cluster
    cluster_map: dict[int, list[int]] = {}
    noise_count = 0
    for idx, label in enumerate(labels):
        if label == -1:
            noise_count += 1
        else:
            cluster_map.setdefault(int(label), []).append(idx)

    # Build output with representative IDs (closest to centroid)
    clusters = []
    for cluster_id, indices in sorted(cluster_map.items()):
        cluster_embeddings = embeddings[indices]
        centroid = cluster_embeddings.mean(axis=0)
        distances = np.linalg.norm(cluster_embeddings - centroid, axis=1)
        # Top 3 closest to centroid as representatives
        rep_count = min(3, len(indices))
        rep_indices = np.argsort(distances)[:rep_count]

        clusters.append({
            "cluster_id": cluster_id,
            "candidate_ids": [candidate_ids[i] for i in indices],
            "representative_ids": [candidate_ids[indices[i]] for i in rep_indices],
            "size": len(indices),
        })

    print(json.dumps({
        "clusters": clusters,
        "noise_count": noise_count,
        "total": len(embeddings),
    }))


if __name__ == "__main__":
    main()
