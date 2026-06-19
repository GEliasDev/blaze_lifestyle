import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { config } from "../config.js";

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
  await r2().send(new PutObjectCommand({ Bucket: config.r2.bucket, Key: key, Body: body, ContentType: contentType }));
}

export async function getObject(key) {
  const out = await r2().send(new GetObjectCommand({ Bucket: config.r2.bucket, Key: key }));
  return { body: out.Body, contentType: out.ContentType };
}

export async function deleteObject(key) {
  await r2().send(new DeleteObjectCommand({ Bucket: config.r2.bucket, Key: key }));
}
