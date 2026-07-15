import { Op } from "sequelize";
import { CoachClientModel } from "./coachClients.model.js";
import { UserModel } from "../users/users.model.js";
import { MealEntryModel } from "../nutrition/mealEntry.model.js";
import { COACH_CLIENT_STATUS } from "../../shared/index.js";
import { HttpError } from "../../middleware/error.js";

export const coachingService = {
  // Every coach is also their own "client" (a self-referential link, nickname
  // "ME") so they can log their own nutrition/exercise through the exact same
  // screens/routes used to review a real client — see /coach/clients/:clientId
  // in cliente's router.jsx, which works unchanged when clientId === coachId
  // (assertCoachOwnsClient just checks a CoachClientModel row exists). Called
  // on every server boot (idempotent) so existing coaches get one too.
  async ensureSelfClients() {
    const coaches = await UserModel.findAll({ where: { role: "coach" } });
    for (const coach of coaches) {
      await CoachClientModel.findOrCreate({
        where: { coachId: coach.id, clientId: coach.id },
        defaults: { status: "approved", nickname: "ME" },
      });
    }
  },

  // Rejected clients are excluded on purpose — once a coach rejects someone,
  // that client drops out of view entirely until they submit a fresh request
  // (see account.service.js's linkCoach, which re-opens a rejected link back
  // to "pending" instead of creating a new row). The self-link (isSelf) is
  // always sorted first so "ME" doesn't get lost among real clients.
  async listClients(coachId) {
    const links = await CoachClientModel.findAll({ where: { coachId, status: { [Op.ne]: "rejected" } } });
    const out = [];
    for (const l of links) {
      const u = await UserModel.findByPk(l.clientId);
      if (!u) continue;
      out.push({ id: u.id, name: u.name, email: u.email, status: l.status, nickname: l.nickname, isSelf: l.clientId === coachId });
    }
    out.sort((a, b) => Number(b.isSelf) - Number(a.isSelf));
    return out;
  },

  // Coach-only label, stored on the link (not the client's account) — see
  // coachClients.model.js. Empty string clears it back to null (show the
  // real name again) rather than storing a blank string.
  async setNickname(coachId, clientId, nickname) {
    const link = await CoachClientModel.findOne({ where: { coachId, clientId } });
    if (!link) throw new HttpError(404, "Client not found");
    await link.update({ nickname: nickname || null });
    return { nickname: link.nickname };
  },

  // "approved" unlocks the client's app (see RequireApprovedClient in
  // cliente's router); "rejected" keeps them blocked and drops them from
  // listClients above, until they retry (linkCoach in account.service.js).
  async setClientStatus(coachId, clientId, status) {
    if (!COACH_CLIENT_STATUS.includes(status)) throw new HttpError(400, "Invalid status");
    const link = await CoachClientModel.findOne({ where: { coachId, clientId } });
    if (!link) throw new HttpError(404, "Client not found");
    await link.update({ status });
    return { status: link.status };
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
