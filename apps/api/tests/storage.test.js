import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { makeThumbnail, buildKey } from "../src/lib/storage.js";

describe("storage helper", () => {
  it("buildKey returns a unique prefixed key", () => {
    const k1 = buildKey("meals", "jpg");
    const k2 = buildKey("meals", "jpg");
    expect(k1).toMatch(/^meals\/.+\.jpg$/);
    expect(k1).not.toBe(k2);
  });

  it("makeThumbnail shrinks an image", async () => {
    const src = await sharp({ create: { width: 800, height: 800, channels: 3, background: "red" } })
      .jpeg().toBuffer();
    const thumb = await makeThumbnail(src);
    const meta = await sharp(thumb).metadata();
    expect(meta.width).toBeLessThanOrEqual(320);
  });
});
