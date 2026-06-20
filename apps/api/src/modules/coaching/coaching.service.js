import { CoachClientModel } from "./coachClients.model.js";
import { CoachCommentModel } from "./coachComment.model.js";
import { UserModel } from "../users/users.model.js";
import { MealEntryModel } from "../nutrition/mealEntry.model.js";
import { MealPhotoModel } from "../nutrition/mealPhoto.model.js";
import { assertCoachOwnsClient } from "../../lib/ownership.js";
import { HttpError } from "../../middleware/error.js";

async function loadEntryForCoach(coachId, entryId) {
  const entry = await MealEntryModel.findByPk(entryId);
  if (!entry) throw new HttpError(404, "Entry not found");
  await assertCoachOwnsClient(coachId, entry.clientId);
  return entry;
}

function effective(entry) {
  if (entry.planItemId == null) return "na";
  return entry.coachCompliance ?? entry.clientCompliance;
}

export const coachingService = {
  async listClients(coachId) {
    const links = await CoachClientModel.findAll({ where: { coachId } });
    const out = [];
    for (const l of links) {
      const u = await UserModel.findByPk(l.clientId);
      if (!u) continue;
      const total = await MealEntryModel.count({ where: { clientId: u.id } });
      out.push({ id: u.id, name: u.name, email: u.email, totalEntries: total });
    }
    return out;
  },

  async getClientMetrics(coachId, clientId) {
    await assertCoachOwnsClient(coachId, clientId);
    const entries = await MealEntryModel.findAll({ where: { clientId } });
    const total = entries.length;
    const onPlan = entries.filter((e) => e.planItemId != null);
    const compliant = onPlan.filter((e) => effective(e) === "yes").length;
    const symptomDays = new Set(entries.filter((e) => e.hasSymptoms).map((e) => String(e.eatenAt).slice(0, 10))).size;
    const client = await UserModel.findByPk(clientId);
    return {
      id: client.id, name: client.name, email: client.email,
      metrics: {
        totalEntries: total,
        compliancePct: onPlan.length ? Math.round((compliant / onPlan.length) * 100) : null,
        symptomDays,
      },
    };
  },

  async listClientEntries(coachId, clientId, filters = {}) {
    await assertCoachOwnsClient(coachId, clientId);
    const where = { clientId };
    if (filters.category) where.category = filters.category;
    if (filters.hasSymptoms === "true") where.hasSymptoms = true;
    const entries = await MealEntryModel.findAll({ where, order: [["eaten_at", "DESC"]] });
    const out = [];
    for (const e of entries) {
      const photos = await MealPhotoModel.findAll({ where: { entryId: e.id }, order: [["position", "ASC"]] });
      out.push({
        id: e.id, category: e.category, description: e.description, eatenAt: e.eatenAt,
        hasSymptoms: e.hasSymptoms, clientCompliance: e.clientCompliance, coachCompliance: e.coachCompliance,
        photos: photos.map((p) => ({ thumbKey: p.thumbKey, storageKey: p.storageKey, position: p.position })),
      });
    }
    return out;
  },

  async getClientEntry(coachId, clientId, entryId) {
    await assertCoachOwnsClient(coachId, clientId);
    const entry = await MealEntryModel.findByPk(entryId);
    if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
    const photos = await MealPhotoModel.findAll({ where: { entryId }, order: [["position", "ASC"]] });
    const comments = await CoachCommentModel.findAll({ where: { entryId }, order: [["created_at", "ASC"]] });
    return {
      id: entry.id, category: entry.category, description: entry.description, eatenAt: entry.eatenAt,
      hasSymptoms: entry.hasSymptoms, symptomDescription: entry.symptomDescription,
      clientCompliance: entry.clientCompliance, coachCompliance: entry.coachCompliance,
      photos: photos.map((p) => ({ thumbKey: p.thumbKey, storageKey: p.storageKey, position: p.position })),
      comments: comments.map((c) => ({ id: c.id, body: c.body, createdAt: c.createdAt })),
    };
  },

  async addComment(coachId, entryId, body) {
    const entry = await loadEntryForCoach(coachId, entryId);
    return CoachCommentModel.create({ entryId: entry.id, coachId, body });
  },

  async confirmCompliance(coachId, entryId, value) {
    const entry = await loadEntryForCoach(coachId, entryId);
    return entry.update({ coachCompliance: value, coachComplianceAt: new Date() });
  },
};
