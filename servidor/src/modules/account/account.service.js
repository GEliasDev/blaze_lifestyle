import { CoachClientModel } from "../coaching/coachClients.model.js";
import { UserModel } from "../users/users.model.js";
import { HttpError } from "../../middleware/error.js";
import { verifyPassword, hashPassword } from "../../lib/password.js";

export const accountService = {
  async getCoach(clientId) {
    const link = await CoachClientModel.findOne({ where: { clientId } });
    if (!link) return null;
    const coach = await UserModel.findByPk(link.coachId);
    return coach ? { id: coach.id, name: coach.name } : null;
  },

  async linkCoach(clientId, coachCode) {
    if (await CoachClientModel.findOne({ where: { clientId } })) throw new HttpError(409, "Already linked to a coach");
    const coach = await UserModel.findOne({ where: { role: "coach", coachCode } });
    if (!coach) throw new HttpError(404, "Invalid coach code");
    await CoachClientModel.create({ coachId: coach.id, clientId });
    return { id: coach.id, name: coach.name };
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
