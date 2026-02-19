import type { ArtifactStore } from "./ArtifactStore";

export interface PresignableStore extends ArtifactStore {
  getPresignedUploadUrl(
    path: string,
    contentType: string,
    expiresInSeconds?: number
  ): Promise<string>;
  getPresignedDownloadUrl(
    path: string,
    expiresInSeconds?: number
  ): Promise<string>;
}
