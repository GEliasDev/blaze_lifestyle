import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { seedCoach } from "../src/db/seed.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model.js";
import { hashPassword } from "../src/lib/password.js";

let app, coachToken, clientToken, clientId, entryId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await seedCoach();
  coachToken = signAccess({ sub: coach.id, role: "coach" });
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  clientId = client.id;
  clientToken = signAccess({ sub: client.id, role: "client" });
  await CoachClientModel.create({ coachId: coach.id, clientId: client.id });
  const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: "red" } }).jpeg().toBuffer();
  const create = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
    .field("category", "Breakfast").field("eatenAt", "2026-06-15T08:00:00.000Z").field("clientCompliance", "no")
    .attach("photos", jpeg, "m.jpg");
  entryId = create.body.id;
});

describe("coaching", () => {
  it("lists clients, comments, confirms compliance, and computes metrics", async () => {
    const clients = await request(app).get("/api/coach/clients").set("Authorization", `Bearer ${coachToken}`);
    expect(clients.status).toBe(200);
    expect(clients.body.some((c) => c.id === clientId)).toBe(true);

    const comment = await request(app).post(`/api/coach/entries/${entryId}/comments`)
      .set("Authorization", `Bearer ${coachToken}`).send({ body: "Add more protein" });
    expect(comment.status).toBe(201);

    const conf = await request(app).patch(`/api/coach/entries/${entryId}/compliance`)
      .set("Authorization", `Bearer ${coachToken}`).send({ coachCompliance: "yes" });
    expect(conf.status).toBe(200);

    const metrics = await request(app).get(`/api/coach/clients/${clientId}`).set("Authorization", `Bearer ${coachToken}`);
    expect(metrics.body.metrics.totalEntries).toBe(1);
    expect(metrics.body.metrics.compliancePct).toBeNull();
    expect(metrics.body.metrics.symptomDays).toBe(0);

    // client sees the coach comment on the entry detail
    const detail = await request(app).get(`/api/me/entries/${entryId}`).set("Authorization", `Bearer ${clientToken}`);
    expect(detail.body.comments.length).toBe(1);
  });

  it("forbids commenting on a non-client's entry", async () => {
    const stranger = await UserModel.create({ role: "client", email: "s@x.com", name: "S", passwordHash: await hashPassword("secret12") });
    const strangerToken = signAccess({ sub: stranger.id, role: "client" });
    const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: "blue" } }).jpeg().toBuffer();
    const e = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${strangerToken}`)
      .field("category", "Lunch").field("eatenAt", "2026-06-15T13:00:00.000Z").attach("photos", jpeg, "m.jpg");
    const res = await request(app).post(`/api/coach/entries/${e.body.id}/comments`)
      .set("Authorization", `Bearer ${coachToken}`).send({ body: "x" });
    expect(res.status).toBe(403);
  });
});
