import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { seedCoach } from "../src/db/seed.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model.js";
import { hashPassword } from "../src/lib/password.js";

let app, coachToken, clientToken, clientId;

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const coach = await seedCoach();
  coachToken = signAccess({ sub: coach.id, role: "coach" });
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  clientId = client.id;
  clientToken = signAccess({ sub: client.id, role: "client" });
  await CoachClientModel.create({ coachId: coach.id, clientId: client.id });
});

describe("meal plans", () => {
  it("coach creates a plan with weekly + dated items, client resolves today", async () => {
    const plan = await request(app).post(`/api/coach/clients/${clientId}/plan`)
      .set("Authorization", `Bearer ${coachToken}`).send({ name: "Plan Jun", startDate: "2026-06-01" });
    expect(plan.status).toBe(201);
    const planId = plan.body.id;

    // Weekly Monday breakfast (2026-06-15 is a Monday → day_of_week 1)
    await request(app).post(`/api/coach/plans/${planId}/items`).set("Authorization", `Bearer ${coachToken}`)
      .send({ category: "Breakfast", title: "Avena", dayOfWeek: 1 });
    // Date-specific override for 2026-06-15 breakfast
    await request(app).post(`/api/coach/plans/${planId}/items`).set("Authorization", `Bearer ${coachToken}`)
      .send({ category: "Breakfast", title: "Huevos (especial)", specificDate: "2026-06-15" });

    const today = await request(app).get(`/api/me/plan/today?date=2026-06-15`).set("Authorization", `Bearer ${clientToken}`);
    expect(today.status).toBe(200);
    const breakfast = today.body.find((r) => r.category === "Breakfast");
    expect(breakfast.title).toBe("Huevos (especial)"); // date-specific overrides weekday
  });

  it("rejects a coach acting on a non-client", async () => {
    const other = await UserModel.create({ role: "client", email: "c2@x.com", name: "C2", passwordHash: await hashPassword("secret12") });
    const res = await request(app).post(`/api/coach/clients/${other.id}/plan`)
      .set("Authorization", `Bearer ${coachToken}`).send({ name: "X", startDate: "2026-06-01" });
    expect(res.status).toBe(403);
  });
});
