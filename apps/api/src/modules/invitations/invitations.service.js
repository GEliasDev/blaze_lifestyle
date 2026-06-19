import { randomBytes } from "node:crypto";
import { InvitationModel } from "./invitations.model.js";
import { UserModel } from "../users/users.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { hashPassword } from "../../lib/password.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { authService } from "../auth/auth.service.js";
import { HttpError } from "../../middleware/error.js";

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export const invitationsService = {
  async create(coachId, email) {
    return InvitationModel.create({
      coachId, email,
      token: randomBytes(24).toString("hex"),
      expiresAt: new Date(Date.now() + THIRTY_DAYS),
    });
  },

  async preview(token) {
    const inv = await InvitationModel.findOne({ where: { token } });
    if (!inv || inv.status !== "pending") throw new HttpError(404, "Invitation not found");
    const coach = await UserModel.findByPk(inv.coachId);
    return { email: inv.email, coachName: coach ? coach.name : "" };
  },

  async accept(token, name, password) {
    const inv = await InvitationModel.findOne({ where: { token } });
    if (!inv || inv.status !== "pending" || inv.expiresAt < new Date()) {
      throw new HttpError(400, "Invitation is not valid");
    }
    const client = await UserModel.create({
      role: "client", email: inv.email, name, locale: "es",
      passwordHash: await hashPassword(password),
    });
    await CoachClientModel.create({ coachId: inv.coachId, clientId: client.id });
    inv.status = "accepted";
    await inv.save();
    const payload = { sub: client.id, role: client.role };
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: authService.toUser(client) };
  },
};
