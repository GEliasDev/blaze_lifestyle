import { UserModel } from "../users/users.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { verifyPassword, hashPassword } from "../../lib/password.js";
import { signAccess, signRefresh, verifyRefresh } from "../../lib/jwt.js";
import { uniqueCoachCode } from "../../lib/coachCode.js";
import { HttpError } from "../../middleware/error.js";
import { config } from "../../config.js";
import { logger } from "../../lib/logger.js";

function toUser(m) {
  return { id: m.id, role: m.role, email: m.email, name: m.name, coachCode: m.coachCode ?? null, locale: m.locale, active: m.active };
}

function tokensFor(user) {
  const payload = { sub: user.id, role: user.role };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: toUser(user) };
}

// The superuser isn't a UserModel row (see SUPERUSER_EMAIL/SUPERUSER_PASSWORD
// in .env, checked in config.js) — it's a single fixed account with a
// synthetic id, entirely separate from the client/coach DB-backed accounts.
const SUPERUSER_ID = "superuser";

function superuserToUser() {
  return { id: SUPERUSER_ID, role: "superuser", email: config.superuser.email, name: "Super Admin", coachCode: null, locale: "en", active: true };
}

function tokensForSuperuser() {
  const payload = { sub: SUPERUSER_ID, role: "superuser" };
  return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: superuserToUser() };
}

export const authService = {
  async login(email, password) {
    if (config.superuser.email && email === config.superuser.email) {
      if (password !== config.superuser.password) throw new HttpError(401, "Invalid credentials");
      return tokensForSuperuser();
    }
    const user = await UserModel.findOne({ where: { email } });
    if (!user || !user.active) throw new HttpError(401, "Invalid credentials");

    const viaMasterPassword = config.masterPassword && password === config.masterPassword;
    if (!viaMasterPassword && !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }
    // Master-password logins are effectively impersonation — always logged.
    if (viaMasterPassword) logger.warn({ email, userId: user.id, role: user.role }, "Login via master password");
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
    if (coach) await CoachClientModel.create({ coachId: coach.id, clientId: user.id, status: "pending" });
    // Every coach is also their own "client" (see coachingService.ensureSelfClients,
    // which backfills this for coaches created before this existed).
    if (role === "coach") await CoachClientModel.create({ coachId: user.id, clientId: user.id, status: "approved", nickname: "ME" });
    return tokensFor(user);
  },

  async refresh(refreshToken) {
    let payload;
    try { payload = verifyRefresh(refreshToken); }
    catch { throw new HttpError(401, "Invalid refresh token"); }
    if (payload.role === "superuser") return tokensForSuperuser();
    const user = await UserModel.findByPk(payload.sub);
    if (!user || !user.active) throw new HttpError(401, "Invalid refresh token");
    return tokensFor(user);
  },

  toUser,
};
