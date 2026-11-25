/**
 * Cloudflare R2 (S3-compatible) media storage. Used by the web app (to sign uploads
 * and playback links) and by the processing jobs on Trigger.dev, so it must not
 * import anything Next.js-specific.
 */
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export type R2Config = { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string };

export function r2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

let cached: { client: S3Client; bucket: string } | null = null;

export function r2(): { client: S3Client; bucket: string } {
  if (cached) return cached;
  const config = r2Config();
  if (!config) throw new Error("Media storage isn't configured (R2_* environment variables).");
  cached = {
    bucket: config.bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    }),
  };
  return cached;
}

/** 16 MB parts: big enough to be efficient, small enough to retry quickly on a weak connection. */
export const PART_SIZE = 16 * 1024 * 1024;

export async function startMultipartUpload(key: string, contentType: string): Promise<string> {
  const { client, bucket } = r2();
  const res = await client.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: key, ContentType: contentType }));
  if (!res.UploadId) throw new Error("Storage didn't return an upload id");
  return res.UploadId;
}

export async function signUploadPart(key: string, uploadId: string, partNumber: number): Promise<string> {
  const { client, bucket } = r2();
  return getSignedUrl(client, new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }), {
    expiresIn: 60 * 60 * 6,
  });
}

export async function completeMultipartUpload(key: string, uploadId: string, parts: { PartNumber: number; ETag: string }[]) {
  const { client, bucket } = r2();
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: [...parts].sort((a, b) => a.PartNumber - b.PartNumber) },
    }),
  );
}

export async function abortMultipartUpload(key: string, uploadId: string) {
  const { client, bucket } = r2();
  await client.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId })).catch(() => undefined);
}

/** A temporary link to a private file (for playback in the dashboard and for transcription). */
export async function signedDownloadUrl(key: string, expiresIn = 60 * 60): Promise<string> {
  const { client, bucket } = r2();
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export async function putObject(key: string, body: Buffer | Uint8Array | NodeJS.ReadableStream, contentType: string, contentLength?: number) {
  const { client, bucket } = r2();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body as Buffer,
      ContentType: contentType,
      ContentLength: contentLength,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
}

export async function getObjectStream(key: string) {
  const { client, bucket } = r2();
  const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!res.Body) throw new Error(`Empty object: ${key}`);
  return res.Body as NodeJS.ReadableStream;
}

export async function deleteObjects(keys: (string | null | undefined)[]) {
  const wanted = keys.filter((k): k is string => !!k);
  if (wanted.length === 0) return;
  const { client, bucket } = r2();
  await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: wanted.map((Key) => ({ Key })), Quiet: true } })).catch(() => undefined);
}

/** Where an episode's files live: <workspace>/<show>/<episode>/... */
export const mediaKeys = (workspaceId: string, showId: string, episodeId: string) => {
  const base = `${workspaceId}/${showId}/${episodeId}`;
  return {
    original: (ext: string) => `${base}/original.${ext}`,
    audio: `${base}/audio.mp3`,
  };
};
