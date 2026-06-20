import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";

let app;
beforeAll(async () => { await sequelize.sync({ force: true }); app = createApp(); });

describe("POST /api/auth/register", () => {
  it("registers a coach and returns a coach code", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ name: "Coach", email: "coach@x.com", password: "secret12", role: "coach" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("coach");
    expect(res.body.user.coachCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(res.body.accessToken).toBeTruthy();
  });

  it("registers a client with a valid coach code and links them", async () => {
    const coach = await request(app).post("/api/auth/register")
      .send({ name: "C2", email: "coach2@x.com", password: "secret12", role: "coach" });
    const code = coach.body.user.coachCode;
    const client = await request(app).post("/api/auth/register")
      .send({ name: "Cli", email: "cli@x.com", password: "secret12", role: "client", coachCode: code });
    expect(client.status).toBe(201);
    expect(client.body.user.role).toBe("client");
    // the coach now lists this client
    const list = await request(app).get("/api/coach/clients").set("Authorization", `Bearer ${coach.body.accessToken}`);
    expect(list.body.some((c) => c.email === "cli@x.com")).toBe(true);
  });

  it("rejects a client registering with an invalid coach code (400)", async () => {
    const res = await request(app).post("/api/auth/register")
      .send({ name: "X", email: "x@x.com", password: "secret12", role: "client", coachCode: "ZZZZZZ" });
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email (409)", async () => {
    await request(app).post("/api/auth/register").send({ name: "D", email: "dup@x.com", password: "secret12", role: "client" });
    const res = await request(app).post("/api/auth/register").send({ name: "D2", email: "dup@x.com", password: "secret12", role: "client" });
    expect(res.status).toBe(409);
  });
});
