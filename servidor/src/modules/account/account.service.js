import { CoachClientModel } from "../coaching/coachClients.model.js";
import { UserModel } from "../users/users.model.js";
import { HttpError } from "../../middleware/error.js";
import { verifyPassword, hashPassword } from "../../lib/password.js";

export const accountService = {
  async getCoach(clientId) {
    const link = await CoachClientModel.findOne({ where: { clientId } });
    if (!link) return null;
    const coach = await UserModel.findByPk(link.coachId);
    return coach ? { id: coach.id, name: coach.name, status: link.status } : null;
  },

  // Same pending-approval gate as registration (see auth.service.js) — a
  // client linking to a coach here still needs that coach to accept them
  // before the app unlocks (see RequireApprovedClient in cliente's router).
  // A rejected link can be retried (same or a different coachCode) since
  // there's only ever one row per client: it gets repointed and reset to
  // "pending" instead of creating a second one. Anything else already-linked
  // (pending or approved) stays blocked.
  async linkCoach(clientId, coachCode) {
    const coach = await UserModel.findOne({ where: { role: "coach", coachCode } });
    if (!coach) throw new HttpError(404, "Invalid coach code");
    const existing = await CoachClientModel.findOne({ where: { clientId } });
    if (existing) {
      if (existing.status !== "rejected") throw new HttpError(409, "Already linked to a coach");
      await existing.update({ coachId: coach.id, status: "pending" });
      return { id: coach.id, name: coach.name, status: "pending" };
    }
    await CoachClientModel.create({ coachId: coach.id, clientId, status: "pending" });
    return { id: coach.id, name: coach.name, status: "pending" };
  },

  async getProfile(userId) {
    const user = await UserModel.findByPk(userId);
    if (!user) throw new HttpError(404, "User not found");
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },

  async updateProfile(userId, { name, email }) {
    const user = await UserModel.findByPk(userId);
    if (!user) throw new HttpError(404, "User not found");
    if (email && email !== user.email) {
      const exists = await UserModel.findOne({ where: { email } });
      if (exists) throw new HttpError(409, "Email already in use");
    }
    if (name) user.name = name;
    if (email) user.email = email;
    await user.save();
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  },

  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await UserModel.findByPk(userId);
    if (!user) throw new HttpError(404, "User not found");
    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new HttpError(401, "Current password is incorrect");
    }
    user.passwordHash = await hashPassword(newPassword);
    await user.save();
    return { ok: true };
  },
};
