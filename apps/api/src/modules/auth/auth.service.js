import { UserModel } from "../users/users.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { verifyPassword, hashPassword } from "../../lib/password.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { uniqueCoachCode } from "../../lib/coachCode.js";
import { HttpError } from "../../middleware/error.js";

function toUser(m) {
  return { id: m.id, role: m.role, email: m.email, name: m.name, coachCode: m.coachCode ?? null, locale: m.locale, active: m.active };
}

function tokensFor(user) {
  const payload = { sub: user.id, role: user.role };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: toUser(user) };
}

export const authService = {
  async login(email, password) {
    const user = await UserModel.findOne({ where: { email } });
    if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }
    return tokensFor(user);
  },

  async register({ name, email, password, role, coachCode }) {
    if (await UserModel.findOne({ where: { email } })) throw new HttpError(409, "Email already registered");
    let coach = null;
    if (role === "client" && coachCode) {
      coach = await UserModel.findOne({ where: { role: "coach", coachCode } });
      if (!coach) throw new HttpError(400, "Invalid coach code");
    }
    const user = await UserModel.create({
      role, email, name, locale: "es",
      passwordHash: await hashPassword(password),
      coachCode: role === "coach" ? await uniqueCoachCode() : null,
    });
    if (coach) await CoachClientModel.create({ coachId: coach.id, clientId: user.id });
    return tokensFor(user);
  },

  toUser,
};
