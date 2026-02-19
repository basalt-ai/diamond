import type { ArtifactStore } from "./ArtifactStore";
import type { PresignableStore } from "./PresignableStore";

export function isPresignable(store: ArtifactStore): store is PresignableStore {
  return "getPresignedUploadUrl" in store && "getPresignedDownloadUrl" in store;
}
