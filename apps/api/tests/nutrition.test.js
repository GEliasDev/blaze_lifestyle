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

let app, clientToken, otherToken, planItemId, foreignItemId;
const jpeg = () => sharp({ create: { width: 64, height: 64, channels: 3, background: "green" } }).jpeg().toBuffer();

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await UserModel.create({ role: "coach", email: "co@x.com", name: "Co", passwordHash: await hashPassword("secret12") });
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  const other = await UserModel.create({ role: "client", email: "c2@x.com", name: "C2", passwordHash: await hashPassword("secret12") });
  clientToken = signAccess({ sub: client.id, role: "client" });
  otherToken = signAccess({ sub: other.id, role: "client" });
  await CoachClientModel.create({ coachId: coach.id, clientId: client.id });
  const plan = await MealPlanModel.create({ coachId: coach.id, clientId: client.id, name: "P", startDate: "2026-06-01", active: true });
  const item = await MealPlanItemModel.create({ planId: plan.id, category: "Breakfast", title: "Avena", dayOfWeek: 1 });
  planItemId = item.id;
  // an item on a DIFFERENT client's plan (foreign)
  const otherPlan = await MealPlanModel.create({ coachId: coach.id, clientId: other.id, name: "P2", startDate: "2026-06-01", active: true });
  const otherItem = await MealPlanItemModel.create({ planId: otherPlan.id, category: "Lunch", title: "X", dayOfWeek: 1 });
  foreignItemId = otherItem.id;
});

describe("evidence entries", () => {
  it("logs evidence for an assigned plan item (category derived) + photo, serves photo to owner only", async () => {
    const res = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("planItemId", planItemId).field("eatenAt", "2026-06-15T08:00:00.000Z")
      .field("hasSymptoms", "false").attach("photos", await jpeg(), "m.jpg");
    expect(res.status).toBe(201);
    expect(res.body.category).toBe("Breakfast");
    expect(res.body.planItemId).toBe(planItemId);
    expect(res.body.photos.length).toBe(1);
    const key = res.body.photos[0].thumbKey;
    expect((await request(app).get(`/api/photos/${key}`).set("Authorization", `Bearer ${clientToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/photos/${key}`).set("Authorization", `Bearer ${otherToken}`)).status).toBe(403);
  });

  it("rejects evidence for a plan item that is not on the client's active plan (403)", async () => {
    const res = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("planItemId", foreignItemId).attach("photos", await jpeg(), "m.jpg");
    expect(res.status).toBe(403);
  });

  it("rejects evidence with no photo (400)", async () => {
    const res = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("planItemId", planItemId);
    expect(res.status).toBe(400);
  });
});
