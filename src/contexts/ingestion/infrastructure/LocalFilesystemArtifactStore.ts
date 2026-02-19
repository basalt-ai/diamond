import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ArtifactStore } from "../application/ports/ArtifactStore";

const ARTIFACT_ROOT = join(process.cwd(), ".ingestion");

export class LocalFilesystemArtifactStore implements ArtifactStore {
  async write(path: string, content: Buffer): Promise<{ sizeBytes: number }> {
    const fullPath = join(ARTIFACT_ROOT, path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
    const stats = await stat(fullPath);
    return { sizeBytes: stats.size };
  }

  readStream(path: string): ReadableStream {
    const fullPath = join(ARTIFACT_ROOT, path);
    return new ReadableStream({
      async start(controller) {
        try {
          const data = await readFile(fullPath);
          controller.enqueue(data);
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  async exists(path: string): Promise<boolean> {
    const fullPath = join(ARTIFACT_ROOT, path);
    return existsSync(fullPath);
  }

  async delete(path: string): Promise<void> {
    const fullPath = join(ARTIFACT_ROOT, path);
    await rm(fullPath, { force: true });
  }
}
