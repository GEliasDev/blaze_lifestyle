import { sequelize } from "../lib/db.js";
import { UserModel } from "../modules/users/users.model.js";
import { hashPassword } from "../lib/password.js";
import { config } from "../config.js";

export async function seedCoach() {
  const existing = await UserModel.findOne({ where: { email: config.seedCoach.email } });
  if (existing) return existing;
  return UserModel.create({
    role: "coach",
    email: config.seedCoach.email,
    name: config.seedCoach.name,
    locale: "es",
    passwordHash: await hashPassword(config.seedCoach.password),
  });
}

// Allow running directly: `npm run seed`
if (process.argv[1] && process.argv[1].endsWith("seed.js")) {
  seedCoach().then(() => sequelize.close()).then(() => console.log("Coach seeded"));
}
