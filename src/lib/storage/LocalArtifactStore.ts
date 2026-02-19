import { existsSync } from "node:fs";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ArtifactStore } from "./ArtifactStore";

const LOCAL_ROOT = join(process.cwd(), ".artifacts");

export class LocalArtifactStore implements ArtifactStore {
  private readonly root: string;

  constructor(keyPrefix?: string) {
    this.root = keyPrefix ? join(LOCAL_ROOT, keyPrefix) : LOCAL_ROOT;
  }

  async write(path: string, content: Buffer): Promise<{ sizeBytes: number }> {
    const fullPath = join(this.root, path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content);
    const stats = await stat(fullPath);
    return { sizeBytes: stats.size };
  }

  readStream(path: string): ReadableStream {
    const fullPath = join(this.root, path);
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
    return existsSync(join(this.root, path));
  }

  async delete(path: string): Promise<void> {
    await rm(join(this.root, path), { force: true });
  }
}
