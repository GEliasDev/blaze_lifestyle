import { MealEntryModel } from "./mealEntry.model.js";
import { MealPhotoModel } from "./mealPhoto.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { buildKey, makeThumbnail, putObject, deleteObject } from "../../lib/storage.js";
import { HttpError } from "../../middleware/error.js";

function serialize(entry, photos) {
  return {
    id: entry.id, clientId: entry.clientId, planItemId: entry.planItemId, category: entry.category,
    description: entry.description, eatenAt: entry.eatenAt, hasSymptoms: entry.hasSymptoms,
    symptomDescription: entry.symptomDescription, clientCompliance: entry.clientCompliance,
    coachCompliance: entry.coachCompliance,
    photos: photos.map((p) => ({ storageKey: p.storageKey, thumbKey: p.thumbKey, position: p.position })),
  };
}

export const nutritionService = {
  async createEntry(clientId, data, files) {
    if (!files || files.length === 0) throw new HttpError(400, "At least one photo is required");
    const entry = await MealEntryModel.create({ clientId, ...data });
    const photos = [];
    for (let i = 0; i < files.length; i++) {
      const full = buildKey("meals", "jpg");
      const thumb = buildKey("thumbs", "jpg");
      await putObject(full, files[i].buffer, files[i].mimetype);
      await putObject(thumb, await makeThumbnail(files[i].buffer), "image/jpeg");
      photos.push(await MealPhotoModel.create({ entryId: entry.id, storageKey: full, thumbKey: thumb, position: i }));
    }
    return serialize(entry, photos);
  },

  async listEntries(clientId, filters = {}) {
    const where = { clientId };
    if (filters.category) where.category = filters.category;
    if (filters.hasSymptoms === "true") where.hasSymptoms = true;
    if (filters.clientCompliance) where.clientCompliance = filters.clientCompliance;
    const entries = await MealEntryModel.findAll({ where, order: [["eaten_at", "DESC"]] });
    const out = [];
    for (const e of entries) {
      const photos = await MealPhotoModel.findAll({ where: { entryId: e.id }, order: [["position", "ASC"]] });
      out.push(serialize(e, photos));
    }
    return out;
  },

  async getEntryForOwner(clientId, id) {
    const entry = await MealEntryModel.findByPk(id);
    if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
    const photos = await MealPhotoModel.findAll({ where: { entryId: id }, order: [["position", "ASC"]] });
    return serialize(entry, photos);
  },

  async updateEntry(clientId, id, data) {
    const entry = await MealEntryModel.findByPk(id);
    if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
    await entry.update(data);
    const photos = await MealPhotoModel.findAll({ where: { entryId: id }, order: [["position", "ASC"]] });
    return serialize(entry, photos);
  },

  async deleteEntry(clientId, id) {
    const entry = await MealEntryModel.findByPk(id);
    if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
    const photos = await MealPhotoModel.findAll({ where: { entryId: id } });
    for (const p of photos) {
      await deleteObject(p.storageKey);
      await deleteObject(p.thumbKey);
      await p.destroy();
    }
    await entry.destroy();
  },

  // Returns the storage key if the requester may read it, else throws.
  async photoAccess(requester, key) {
    const photo = await MealPhotoModel.findOne({ where: { [key.startsWith("thumbs/") ? "thumbKey" : "storageKey"]: key } });
    if (!photo) throw new HttpError(404, "Photo not found");
    const entry = await MealEntryModel.findByPk(photo.entryId);
    if (!entry) throw new HttpError(404, "Photo not found");
    if (requester.role === "client") {
      if (entry.clientId !== requester.sub) throw new HttpError(403, "Forbidden");
    } else {
      const link = await CoachClientModel.findOne({ where: { coachId: requester.sub, clientId: entry.clientId } });
      if (!link) throw new HttpError(403, "Forbidden");
    }
    return key;
  },
};
