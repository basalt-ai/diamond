import type { ArtifactStore } from "./ArtifactStore";
import { LocalArtifactStore } from "./LocalArtifactStore";
import { S3ArtifactStore } from "./S3ArtifactStore";

export function createArtifactStore(opts?: {
  keyPrefix?: string;
}): ArtifactStore {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;

  if (endpoint && bucket) {
    return new S3ArtifactStore({
      endpoint,
      bucket,
      region: process.env.S3_REGION ?? "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
      keyPrefix: opts?.keyPrefix,
    });
  }

  return new LocalArtifactStore(opts?.keyPrefix);
}
