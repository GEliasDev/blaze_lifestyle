import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model.js";
import { MealPlanModel } from "../src/modules/mealplans/mealPlan.model.js";
import { MealPlanItemModel } from "../src/modules/mealplans/mealPlanItem.model.js";
import { hashPassword } from "../src/lib/password.js";

let app, coachToken, clientToken, clientId, entryId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await UserModel.create({ role: "coach", email: "coach@blaze.com", name: "Coach", passwordHash: await hashPassword("secret12") });
  coachToken = signAccess({ sub: coach.id, role: "coach" });
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  clientId = client.id;
  clientToken = signAccess({ sub: client.id, role: "client" });
  await CoachClientModel.create({ coachId: coach.id, clientId: client.id });
  const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: "red" } }).jpeg().toBuffer();
  const plan = await MealPlanModel.create({ coachId: coach.id, clientId: client.id, name: "P", startDate: "2026-06-01", active: true });
  const item = await MealPlanItemModel.create({ planId: plan.id, category: "Breakfast", title: "Avena", dayOfWeek: 1 });
  const create = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
    .field("planItemId", item.id).field("eatenAt", "2026-06-15T08:00:00.000Z")
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
    expect(metrics.body.metrics.compliancePct).toBe(100); // one reviewed entry, coach said yes
    expect(metrics.body.metrics.pendingReview).toBe(0);

    // client sees the coach comment on the entry detail
    const detail = await request(app).get(`/api/me/entries/${entryId}`).set("Authorization", `Bearer ${clientToken}`);
    expect(detail.body.comments.length).toBe(1);

    // coach can fetch the entry detail and see the assignedTitle from the plan item
    const coachDetail = await request(app).get(`/api/coach/clients/${clientId}/entries/${entryId}`).set("Authorization", `Bearer ${coachToken}`);
    expect(coachDetail.body.assignedTitle).toBe("Avena");
  });

  it("forbids commenting on a non-client's entry", async () => {
    const coach2 = await UserModel.findOne({ where: { email: "coach@blaze.com" } });
    const stranger = await UserModel.create({ role: "client", email: "s@x.com", name: "S", passwordHash: await hashPassword("secret12") });
    const strangerToken = signAccess({ sub: stranger.id, role: "client" });
    const jpeg = await sharp({ create: { width: 16, height: 16, channels: 3, background: "blue" } }).jpeg().toBuffer();
    const strangerPlan = await MealPlanModel.create({ coachId: coach2.id, clientId: stranger.id, name: "SP", startDate: "2026-06-01", active: true });
    const strangerItem = await MealPlanItemModel.create({ planId: strangerPlan.id, category: "Lunch", title: "X", dayOfWeek: 1 });
    const e = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${strangerToken}`)
      .field("planItemId", strangerItem.id).field("eatenAt", "2026-06-15T13:00:00.000Z").attach("photos", jpeg, "m.jpg");
    const res = await request(app).post(`/api/coach/entries/${e.body.id}/comments`)
      .set("Authorization", `Bearer ${coachToken}`).send({ body: "x" });
    expect(res.status).toBe(403);
  });
});
