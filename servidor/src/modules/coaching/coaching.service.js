import { CoachClientModel } from "./coachClients.model.js";
import { UserModel } from "../users/users.model.js";

export const coachingService = {
  async listClients(coachId) {
    const links = await CoachClientModel.findAll({ where: { coachId } });
    const out = [];
    for (const l of links) {
      const u = await UserModel.findByPk(l.clientId);
      if (!u) continue;
      out.push({ id: u.id, name: u.name, email: u.email });
    }
    return out;
  },
};
