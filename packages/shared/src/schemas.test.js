import { describe, it, expect } from "vitest";
import { loginSchema, acceptInviteSchema } from "./schemas.js";

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(loginSchema.parse({ email: "a@b.com", password: "secret12" })).toBeTruthy();
  });
  it("rejects short passwords", () => {
    expect(() => loginSchema.parse({ email: "a@b.com", password: "x" })).toThrow();
  });
});

describe("acceptInviteSchema", () => {
  it("requires name and password", () => {
    expect(() => acceptInviteSchema.parse({ name: "", password: "secret12" })).toThrow();
  });
});
