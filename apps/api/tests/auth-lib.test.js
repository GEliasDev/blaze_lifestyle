import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/lib/password.js";
import { signAccess, verifyAccess } from "../src/lib/jwt.js";

describe("password lib", () => {
  it("hashes and verifies", async () => {
    const hash = await hashPassword("secret12");
    expect(await verifyPassword("secret12", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
});

describe("jwt lib", () => {
  it("signs and verifies an access token", () => {
    const token = signAccess({ sub: "u1", role: "coach" });
    expect(verifyAccess(token)).toMatchObject({ sub: "u1", role: "coach" });
  });
});
