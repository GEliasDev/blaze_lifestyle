import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";

const DISK = !config.r2.endpoint;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

const CONTENT_TYPES = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", txt: "text/plain" };
const contentTypeFor = (key) => CONTENT_TYPES[key.split(".").pop().toLowerCase()] ?? "application/octet-stream";

let client = null;
function r2() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: config.r2.endpoint,
      credentials: { accessKeyId: config.r2.accessKeyId, secretAccessKey: config.r2.secretAccessKey },
    });
  }
  return client;
}

export const buildKey = (prefix, ext) => `${prefix}/${randomUUID()}.${ext}`;

export const makeThumbnail = (buffer) =>
  sharp(buffer).resize(320, 320, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();

export async function putObject(key, body, contentType) {
  if (DISK) {
    const full = path.join(UPLOADS_DIR, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, body);
    return;
  }
  await r2().send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key) {
  if (DISK) {
    const full = path.join(UPLOADS_DIR, key);
    const { access } = await import("node:fs/promises");
    await access(full); // throws if missing
    return { body: createReadStream(full), contentType: contentTypeFor(key) };
  }
  const out = await r2().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  return { body: out.Body, contentType: out.ContentType };
}

export async function deleteObject(key) {
  if (DISK) {
    try { await unlink(path.join(UPLOADS_DIR, key)); } catch (err) { if (err.code !== "ENOENT") throw err; }
    return;
  }
  await r2().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
}
