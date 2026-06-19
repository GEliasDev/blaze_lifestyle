import { describe, it, expect, beforeAll } from "vitest";
import { sequelize } from "../src/lib/db.js";
import { UserModel } from "../src/modules/users/users.model.js";

describe("UserModel", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });
  it("creates a coach user with defaults", async () => {
    const u = await UserModel.create({
      role: "coach", email: "c@b.com", passwordHash: "x", name: "Coach",
    });
    expect(u.id).toBeTruthy();
    expect(u.locale).toBe("es");
    expect(u.active).toBe(true);
  });
});
