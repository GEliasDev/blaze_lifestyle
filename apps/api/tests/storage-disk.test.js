import { describe, it, expect } from "vitest";
import { buildKey, putObject, getObject, deleteObject } from "../src/lib/storage.js";

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

describe("disk storage (R2_ENDPOINT empty)", () => {
  it("round-trips an object and deletes it", async () => {
    const key = buildKey("test", "txt");
    await putObject(key, Buffer.from("hello blaze"), "text/plain");
    const got = await getObject(key);
    expect((await streamToBuffer(got.body)).toString()).toBe("hello blaze");
    await deleteObject(key);
    await expect(getObject(key)).rejects.toBeTruthy();
  });
});
