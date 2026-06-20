import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";

let app, coachCode, coachToken;
beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await request(app).post("/api/auth/register")
    .send({ name: "Coach", email: "co@x.com", password: "secret12", role: "coach" });
  coachCode = coach.body.user.coachCode;
  coachToken = coach.body.accessToken;
});

describe("client me/coach link", () => {
  it("links an unlinked client and then reports the coach", async () => {
    const client = await request(app).post("/api/auth/register")
      .send({ name: "Cli", email: "cli2@x.com", password: "secret12", role: "client" });
    const token = client.body.accessToken;

    const before = await request(app).get("/api/me/coach").set("Authorization", `Bearer ${token}`);
    expect(before.body).toBeNull();

    const link = await request(app).post("/api/me/coach").set("Authorization", `Bearer ${token}`).send({ coachCode });
    expect(link.status).toBe(200);
    expect(link.body.name).toBe("Coach");

    const after = await request(app).get("/api/me/coach").set("Authorization", `Bearer ${token}`);
    expect(after.body.name).toBe("Coach");
  });

  it("rejects linking when already linked (409)", async () => {
    const client = await request(app).post("/api/auth/register")
      .send({ name: "Cli3", email: "cli3@x.com", password: "secret12", role: "client", coachCode });
    const token = client.body.accessToken;
    const res = await request(app).post("/api/me/coach").set("Authorization", `Bearer ${token}`).send({ coachCode });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid coach code (404)", async () => {
    const client = await request(app).post("/api/auth/register")
      .send({ name: "Cli4", email: "cli4@x.com", password: "secret12", role: "client" });
    const res = await request(app).post("/api/me/coach").set("Authorization", `Bearer ${client.body.accessToken}`).send({ coachCode: "ZZZZZZ" });
    expect(res.status).toBe(404);
  });
});
