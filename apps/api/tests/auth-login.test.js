import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { hashPassword } from "../src/lib/password.js";

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await UserModel.create({
      role: "coach", email: "c@b.com", name: "Coach",
      passwordHash: await hashPassword("secret12"),
    });
  });
  it("returns tokens for valid credentials", async () => {
    const res = await request(createApp()).post("/api/auth/login")
      .send({ email: "c@b.com", password: "secret12" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe("coach");
  });
  it("401 for bad password", async () => {
    const res = await request(createApp()).post("/api/auth/login")
      .send({ email: "c@b.com", password: "wrongpass" });
    expect(res.status).toBe(401);
  });
});
