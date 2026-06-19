import { describe, it, expect, beforeAll } from "vitest";
import { sequelize } from "../src/lib/db.js";
import { UserModel } from "../src/modules/users/users.model.js";
import { seedCoach } from "../src/db/seed.js";

describe("seedCoach", () => {
  beforeAll(async () => { await sequelize.sync({ force: true }); });
  it("creates one coach and is idempotent", async () => {
    await seedCoach();
    await seedCoach();
    const coaches = await UserModel.findAll({ where: { role: "coach" } });
    expect(coaches.length).toBe(1);
  });
});
