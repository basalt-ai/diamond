import { spawn } from "node:child_process";
import path from "node:path";

import { sql } from "drizzle-orm";

import type { Database } from "@/db";
import { sanitizeError } from "@/lib/api/sanitize";

const SCRIPT_PATH = path.resolve(
  import.meta.dirname ?? __dirname,
  "../../../scripts/cluster.py"
);

interface ClusterResult {
  clusters: Array<{
    cluster_id: number;
    candidate_ids: string[];
    representative_ids: string[];
    size: number;
  }>;
  noise_count: number;
  total: number;
}

export class HdbscanClusterDetector {
  constructor(
    private readonly db: Database,
    private readonly timeoutMs: number = 600_000
  ) {}

  async detect(minClusterSize: number = 5): Promise<ClusterResult> {
    const rows = await this.db.execute(sql`
      SELECT c.id AS candidate_id, e.embedding::text AS embedding_text
      FROM cd_candidates c
      JOIN in_embeddings e ON e.candidate_id = c.id
      WHERE c.scenario_type_id IS NULL
    `);

    const embeddings: number[][] = [];
    const candidateIds: string[] = [];

    for (const row of rows as unknown as Array<{
      candidate_id: string;
      embedding_text: string;
    }>) {
      candidateIds.push(row.candidate_id);
      embeddings.push(JSON.parse(row.embedding_text));
    }

    if (embeddings.length < 15) {
      return {
        clusters: [],
        noise_count: embeddings.length,
        total: embeddings.length,
      };
    }

    const input = JSON.stringify({
      embeddings,
      candidate_ids: candidateIds,
      min_cluster_size: minClusterSize,
      min_samples: 3,
    });

    return this.runPython(input);
  }

  private runPython(input: string): Promise<ClusterResult> {
    return new Promise((resolve, reject) => {
      // spawn with shell: false (default) is safe against injection
      const proc = spawn("python3", [SCRIPT_PATH], {
        stdio: ["pipe", "pipe", "pipe"],
        timeout: this.timeoutMs,
        env: { ...process.env },
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `HDBSCAN clustering failed (exit ${code}): ${sanitizeError(stderr)}`
            )
          );
          return;
        }
        try {
          resolve(JSON.parse(stdout) as ClusterResult);
        } catch {
          reject(new Error("Failed to parse HDBSCAN output"));
        }
      });

      proc.on("error", (err) => {
        reject(new Error(`HDBSCAN subprocess error: ${sanitizeError(err)}`));
      });

      // Catch EPIPE if the subprocess dies before we finish writing
      proc.stdin.on("error", () => {});
      proc.stdin.write(input);
      proc.stdin.end();
    });
  }
}
