import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  NotFound,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { PresignableStore } from "./PresignableStore";

export class S3ArtifactStore implements PresignableStore {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;

  constructor(config: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    keyPrefix?: string;
    forcePathStyle?: boolean;
  }) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    this.bucket = config.bucket;
    this.keyPrefix = config.keyPrefix ?? "";
  }

  private fullKey(path: string): string {
    return this.keyPrefix ? `${this.keyPrefix}/${path}` : path;
  }

  async write(path: string, content: Buffer): Promise<{ sizeBytes: number }> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.fullKey(path),
        Body: content,
        ContentLength: content.byteLength,
      })
    );
    return { sizeBytes: content.byteLength };
  }

  readStream(path: string): ReadableStream {
    const key = this.fullKey(path);
    const client = this.client;
    const bucket = this.bucket;

    return new ReadableStream({
      async start(controller) {
        try {
          const response = await client.send(
            new GetObjectCommand({ Bucket: bucket, Key: key })
          );
          if (!response.Body) {
            controller.close();
            return;
          }
          const webStream = response.Body.transformToWebStream();
          const reader = webStream.getReader();
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });
  }

  async exists(path: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: this.fullKey(path),
        })
      );
      return true;
    } catch (error) {
      if (error instanceof NotFound) return false;
      throw error;
    }
  }

  async delete(path: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: this.fullKey(path),
      })
    );
  }

  async getPresignedUploadUrl(
    path: string,
    contentType: string,
    expiresInSeconds = 900
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: this.fullKey(path),
        ContentType: contentType,
      }),
      {
        expiresIn: expiresInSeconds,
        signableHeaders: new Set(["content-type"]),
      }
    );
  }

  async getPresignedDownloadUrl(
    path: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: this.fullKey(path),
      }),
      { expiresIn: expiresInSeconds }
    );
  }
}
