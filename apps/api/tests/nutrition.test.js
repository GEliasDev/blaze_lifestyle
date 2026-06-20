import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { sequelize } from "../src/lib/db.js";
import { signAccess } from "../src/lib/jwt.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { hashPassword } from "../src/lib/password.js";

let app, clientToken, otherToken;

async function jpeg() {
  return sharp({ create: { width: 64, height: 64, channels: 3, background: "green" } }).jpeg().toBuffer();
}

beforeAll(async () => {
  await sequelize.sync({ force: true });
  app = createApp();
  const client = await UserModel.create({ role: "client", email: "c1@x.com", name: "C1", passwordHash: await hashPassword("secret12") });
  clientToken = signAccess({ sub: client.id, role: "client" });
  const other = await UserModel.create({ role: "client", email: "c2@x.com", name: "C2", passwordHash: await hashPassword("secret12") });
  otherToken = signAccess({ sub: other.id, role: "client" });
});

describe("nutrition entries", () => {
  it("creates an entry with a photo, lists it, and serves the photo only to the owner", async () => {
    const create = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("category", "Breakfast").field("eatenAt", "2026-06-15T08:00:00.000Z")
      .field("clientCompliance", "yes").attach("photos", await jpeg(), "meal.jpg");
    expect(create.status).toBe(201);
    expect(create.body.photos.length).toBe(1);
    const photoKey = create.body.photos[0].thumbKey;

    const list = await request(app).get("/api/me/entries").set("Authorization", `Bearer ${clientToken}`);
    expect(list.body.length).toBe(1);

    const owner = await request(app).get(`/api/photos/${photoKey}`).set("Authorization", `Bearer ${clientToken}`);
    expect(owner.status).toBe(200);

    const intruder = await request(app).get(`/api/photos/${photoKey}`).set("Authorization", `Bearer ${otherToken}`);
    expect(intruder.status).toBe(403);
  });

  it("deletes an entry", async () => {
    const create = await request(app).post("/api/me/entries").set("Authorization", `Bearer ${clientToken}`)
      .field("category", "Lunch").field("eatenAt", "2026-06-15T13:00:00.000Z").attach("photos", await jpeg(), "m.jpg");
    const del = await request(app).delete(`/api/me/entries/${create.body.id}`).set("Authorization", `Bearer ${clientToken}`);
    expect(del.status).toBe(204);
  });
});
