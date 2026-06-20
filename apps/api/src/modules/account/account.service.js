import { CoachClientModel } from "../coaching/coachClients.model.js";
import { UserModel } from "../users/users.model.js";
import { HttpError } from "../../middleware/error.js";

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
};
