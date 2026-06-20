import { CoachClientModel } from "./coachClients.model.js";
import { CoachCommentModel } from "./coachComment.model.js";
import { UserModel } from "../users/users.model.js";
import { MealEntryModel } from "../nutrition/mealEntry.model.js";
import { MealPhotoModel } from "../nutrition/mealPhoto.model.js";
import { MealPlanItemModel } from "../mealplans/mealPlanItem.model.js";
import { assertCoachOwnsClient } from "../../lib/ownership.js";
import { HttpError } from "../../middleware/error.js";

async function loadEntryForCoach(coachId, entryId) {
  const entry = await MealEntryModel.findByPk(entryId);
  if (!entry) throw new HttpError(404, "Entry not found");
  await assertCoachOwnsClient(coachId, entry.clientId);
  return entry;
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
    const reviewed = entries.filter((e) => e.coachCompliance != null);
    const compliant = reviewed.filter((e) => e.coachCompliance === "yes").length;
    const symptomDays = new Set(
      entries.filter((e) => e.hasSymptoms).map((e) => new Date(e.eatenAt).toISOString().slice(0, 10)),
    ).size;
    const client = await UserModel.findByPk(clientId);
    return {
      id: client.id, name: client.name, email: client.email,
      metrics: {
        totalEntries: entries.length,
        compliancePct: reviewed.length ? Math.round((compliant / reviewed.length) * 100) : null,
        pendingReview: entries.length - reviewed.length,
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
    const item = entry.planItemId ? await MealPlanItemModel.findByPk(entry.planItemId) : null;
    return {
      id: entry.id, category: entry.category, description: entry.description, eatenAt: entry.eatenAt,
      hasSymptoms: entry.hasSymptoms, symptomDescription: entry.symptomDescription,
      clientCompliance: entry.clientCompliance, coachCompliance: entry.coachCompliance,
      assignedTitle: item ? item.title : null,
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
