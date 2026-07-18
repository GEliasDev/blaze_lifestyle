import { Op } from "sequelize";
import { MealEntryModel } from "./mealEntry.model.js";
import { MealPhotoModel } from "./mealPhoto.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { buildKey, makeThumbnail, putObject, deleteObject } from "../../lib/storage.js";
import { editEntrySchema, MAX_PHOTOS } from "./nutrition.schema.js";
import { HttpError } from "../../middleware/error.js";

function serialize(entry, photos) {
  return {
    id: entry.id, clientId: entry.clientId, category: entry.category,
    eatenAt: entry.eatenAt, compliance: entry.compliance,
    description: entry.description, hasSymptoms: entry.hasSymptoms, symptomDescription: entry.symptomDescription,
    photos: photos.map((p) => ({ storageKey: p.storageKey, thumbKey: p.thumbKey, position: p.position })),
  };
}

async function photosFor(entryId) {
  return MealPhotoModel.findAll({ where: { entryId }, order: [["position", "ASC"]] });
}

async function addPhotos(entryId, files, startPos = 0) {
  for (let i = 0; i < (files?.length ?? 0); i++) {
    const full = buildKey("meals", "jpg");
    const thumb = buildKey("thumbs", "jpg");
    await putObject(full, files[i].buffer, files[i].mimetype);
    await putObject(thumb, await makeThumbnail(files[i].buffer), "image/jpeg");
    await MealPhotoModel.create({ entryId, storageKey: full, thumbKey: thumb, position: startPos + i });
  }
}

async function ownedEntry(clientId, id) {
  const entry = await MealEntryModel.findByPk(id);
  if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
  return entry;
}

export const nutritionService = {
  async createEntry(clientId, data, files) {
    if ((files?.length ?? 0) > MAX_PHOTOS) throw new HttpError(400, `A meal can have at most ${MAX_PHOTOS} photos`);
    const entry = await MealEntryModel.create({
      clientId,
      category: data.category,
      eatenAt: data.eatenAt ?? new Date(),
      compliance: data.compliance ?? "na",
      description: data.description ?? null,
    });
    await addPhotos(entry.id, files, 0);
    return serialize(entry, await photosFor(entry.id));
  },

  async listEntries(clientId, range = {}) {
    const eatenAt = {};
    let hasRange = false;
    // Op.gte/Op.lte are Symbol keys — Object.keys(eatenAt) can't see them, so
    // that used to always read as "no range" and silently drop this filter
    // entirely (every list call returned the client's whole history). Track
    // whether a bound was actually set with a plain boolean instead.
    if (range.from) { eatenAt[Op.gte] = range.from; hasRange = true; }
    if (range.to) { eatenAt[Op.lte] = range.to; hasRange = true; }
    const where = { clientId, ...(hasRange ? { eatenAt } : {}) };
    const entries = await MealEntryModel.findAll({
      where,
      order: [["eaten_at", "DESC"]],
      ...(range.limit ? { limit: range.limit } : {}),
    });
    const out = [];
    for (const e of entries) out.push(serialize(e, await photosFor(e.id)));
    return out;
  },

  async getEntry(clientId, id) {
    const entry = await ownedEntry(clientId, id);
    return serialize(entry, await photosFor(id));
  },

  // Multipart edit: text fields in rawBody, new photos in files, storageKeys of
  // existing photos to keep in keepKeys. Photos not kept are deleted; new ones
  // are appended. Total is capped at MAX_PHOTOS.
  async updateEntry(clientId, id, rawBody, files = [], keepKeys = []) {
    const entry = await ownedEntry(clientId, id);
    const data = editEntrySchema.parse(rawBody);
    if (data.description === "") data.description = null;
    if (data.hasSymptoms === false) data.symptomDescription = null;
    else if (data.symptomDescription === "") data.symptomDescription = null;

    const existing = await photosFor(id);
    const keep = new Set(keepKeys);
    const kept = existing.filter((p) => keep.has(p.storageKey));
    const toDelete = existing.filter((p) => !keep.has(p.storageKey));
    if (kept.length + (files?.length ?? 0) > MAX_PHOTOS) {
      throw new HttpError(400, `A meal can have at most ${MAX_PHOTOS} photos`);
    }

    for (const p of toDelete) {
      await deleteObject(p.storageKey);
      await deleteObject(p.thumbKey);
      await p.destroy();
    }
    // Reindex kept photos to a contiguous 0..n-1, then append the new ones.
    for (let i = 0; i < kept.length; i++) {
      if (kept[i].position !== i) await kept[i].update({ position: i });
    }
    await addPhotos(id, files, kept.length);

    await entry.update(data);
    return serialize(entry, await photosFor(id));
  },

  // Hard-delete: removes the entry row, its photo rows, and the stored objects.
  async deleteEntry(clientId, id) {
    const entry = await ownedEntry(clientId, id);
    const photos = await photosFor(id);
    for (const p of photos) {
      await deleteObject(p.storageKey);
      await deleteObject(p.thumbKey);
      await p.destroy();
    }
    await entry.destroy();
  },

  // Returns the storage key if the requester may read it (the owning client, or
  // a coach linked to the entry's client), else throws.
  async photoAccess(requester, key) {
    const photo = await MealPhotoModel.findOne({ where: { [key.startsWith("thumbs/") ? "thumbKey" : "storageKey"]: key } });
    if (!photo) throw new HttpError(404, "Photo not found");
    const entry = await MealEntryModel.findByPk(photo.entryId);
    if (!entry) throw new HttpError(404, "Photo not found");
    if (requester.role === "client") {
      if (entry.clientId !== requester.sub) throw new HttpError(403, "Forbidden");
    } else {
      // status: "approved" only — see lib/ownership.js's assertCoachOwnsClient
      // for why a rejected/pending link shouldn't grant access.
      const link = await CoachClientModel.findOne({ where: { coachId: requester.sub, clientId: entry.clientId, status: "approved" } });
      if (!link) throw new HttpError(403, "Forbidden");
    }
    return key;
  },
};
