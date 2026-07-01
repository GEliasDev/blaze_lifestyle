import { Op } from "sequelize";
import { CoachClientModel } from "./coachClients.model.js";
import { UserModel } from "../users/users.model.js";
import { MealEntryModel } from "../nutrition/mealEntry.model.js";
import { HttpError } from "../../middleware/error.js";

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

  async getMetrics(coachId, clientId) {
    const link = await CoachClientModel.findOne({ where: { coachId, clientId } });
    if (!link) throw new HttpError(404, "Client not found");

    const entries = await MealEntryModel.findAll({
      where: { clientId },
      order: [["eaten_at", "DESC"]],
    });

    const totalEntries = entries.length;
    const reviewed = entries.filter((e) => e.compliance === "yes" || e.compliance === "no");
    const compliancePct = reviewed.length > 0
      ? Math.round((reviewed.filter((e) => e.compliance === "yes").length / reviewed.length) * 100)
      : null;
    const symptomDays = new Set(
      entries.filter((e) => e.hasSymptoms).map((e) => new Date(e.eatenAt).toLocaleDateString("en-CA"))
    ).size;
    const pendingReview = entries.filter((e) => e.compliance === "na").length;

    return { totalEntries, compliancePct, symptomDays, pendingReview };
  },
};
