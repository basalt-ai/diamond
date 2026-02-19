export interface ArtifactStore {
  write(path: string, content: Buffer): Promise<{ sizeBytes: number }>;
  readStream(path: string): ReadableStream;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
}
