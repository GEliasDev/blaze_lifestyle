import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { authGuard, roleGuard } from "../src/middleware/auth.js";
import { errorHandler } from "../src/middleware/error.js";
import { signAccess } from "../src/lib/jwt.js";

function appWith() {
  const app = express();
  app.get("/coach-only", authGuard, roleGuard("coach"), (req, res) =>
    res.json({ sub: req.user.sub }));
  app.use(errorHandler);
  return app;
}

describe("auth middleware", () => {
  it("401 without token", async () => {
    expect((await request(appWith()).get("/coach-only")).status).toBe(401);
  });
  it("403 for wrong role", async () => {
    const t = signAccess({ sub: "u1", role: "client" });
    expect((await request(appWith()).get("/coach-only").set("Authorization", `Bearer ${t}`)).status).toBe(403);
  });
  it("200 for coach", async () => {
    const t = signAccess({ sub: "u1", role: "coach" });
    const res = await request(appWith()).get("/coach-only").set("Authorization", `Bearer ${t}`);
    expect(res.status).toBe(200);
    expect(res.body.sub).toBe("u1");
  });
});
