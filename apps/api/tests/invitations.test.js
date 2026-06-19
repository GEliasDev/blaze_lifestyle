import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { seedCoach } from "../src/db/seed.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { CoachClientModel } from "../src/modules/coaching/coachClients.model.js";

describe("invitations flow", () => {
  let coachToken;
  let coachId;
  beforeAll(async () => {
    await sequelize.sync({ force: true });
    const coach = await seedCoach();
    coachId = coach.id;
    coachToken = signAccess({ sub: coach.id, role: "coach" });
  });

  it("coach creates an invitation and client accepts it", async () => {
    const app = createApp();
    const inv = await request(app).post("/api/coach/invitations")
      .set("Authorization", `Bearer ${coachToken}`).send({ email: "client@x.com" });
    expect(inv.status).toBe(201);
    const token = inv.body.token;

    const preview = await request(app).get(`/api/auth/invitations/${token}`);
    expect(preview.body.email).toBe("client@x.com");

    const accepted = await request(app).post(`/api/auth/invitations/${token}/accept`)
      .send({ name: "New Client", password: "secret12" });
    expect(accepted.status).toBe(201);
    expect(accepted.body.user.role).toBe("client");

    const client = await UserModel.findOne({ where: { email: "client@x.com" } });
    const link = await CoachClientModel.findOne({ where: { clientId: client.id } });
    expect(link.coachId).toBe(coachId);
  });

  it("rejects accepting an already-accepted invitation", async () => {
    const app = createApp();
    const inv = await request(app).post("/api/coach/invitations")
      .set("Authorization", `Bearer ${coachToken}`).send({ email: "two@x.com" });
    const token = inv.body.token;
    await request(app).post(`/api/auth/invitations/${token}/accept`).send({ name: "A", password: "secret12" });
    const second = await request(app).post(`/api/auth/invitations/${token}/accept`).send({ name: "B", password: "secret12" });
    expect(second.status).toBe(400);
  });
});
