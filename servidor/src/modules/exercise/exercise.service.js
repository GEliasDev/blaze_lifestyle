import { Op } from "sequelize";
import { ExerciseEntryModel } from "./exerciseEntry.model.js";
import { ExercisePhotoModel } from "./exercisePhoto.model.js";
import { ExerciseTagModel } from "./exerciseTag.model.js";
import { ExerciseEntryTagModel } from "./exerciseEntryTag.model.js";
import { CoachClientModel } from "../coaching/coachClients.model.js";
import { buildKey, makeThumbnail, putObject, deleteObject } from "../../lib/storage.js";
import { editEntrySchema, MAX_PHOTOS } from "./exercise.schema.js";
import { SYSTEM_EXERCISE_TAGS } from "../../shared/index.js";
import { HttpError } from "../../middleware/error.js";

async function photosFor(entryId) {
  return ExercisePhotoModel.findAll({ where: { entryId }, order: [["position", "ASC"]] });
}

async function tagsFor(entryId) {
  const links = await ExerciseEntryTagModel.findAll({ where: { entryId } });
  if (links.length === 0) return [];
  const tags = await ExerciseTagModel.findAll({ where: { id: links.map((l) => l.tagId) } });
  const byId = new Map(tags.map((t) => [t.id, t]));
  return links.map((l) => byId.get(l.tagId)).filter(Boolean);
}

function serializeTag(tag) {
  return { id: tag.id, name: tag.name, color: tag.color, isSystem: tag.isSystem };
}

async function serialize(entry) {
  const [photos, tags] = await Promise.all([photosFor(entry.id), tagsFor(entry.id)]);
  return {
    id: entry.id,
    clientId: entry.clientId,
    exercisedAt: entry.exercisedAt,
    description: entry.description,
    biofeedback: entry.biofeedback,
    photos: photos.map((p) => ({ storageKey: p.storageKey, thumbKey: p.thumbKey, position: p.position })),
    tags: tags.map(serializeTag),
  };
}

// Exercise photos use their own key prefixes ("exercise" / "exercise-thumbs"),
// distinct from Nutrition's ("meals" / "thumbs") — see photos.route.js, which
// dispatches the shared /api/photos/:prefix/:file proxy by prefix.
async function addPhotos(entryId, files, startPos = 0) {
  for (let i = 0; i < (files?.length ?? 0); i++) {
    const full = buildKey("exercise", "jpg");
    const thumb = buildKey("exercise-thumbs", "jpg");
    await putObject(full, files[i].buffer, files[i].mimetype);
    await putObject(thumb, await makeThumbnail(files[i].buffer), "image/jpeg");
    await ExercisePhotoModel.create({ entryId, storageKey: full, thumbKey: thumb, position: startPos + i });
  }
}

async function setTags(entryId, tagIds) {
  await ExerciseEntryTagModel.destroy({ where: { entryId } });
  for (const tagId of tagIds) {
    await ExerciseEntryTagModel.create({ entryId, tagId });
  }
}

async function ownedEntry(clientId, id) {
  const entry = await ExerciseEntryModel.findByPk(id);
  if (!entry || entry.clientId !== clientId) throw new HttpError(404, "Entry not found");
  return entry;
}

function dayKey(date) {
  return new Date(date).toLocaleDateString("en-CA");
}

export const exerciseService = {
  async createEntry(clientId, data, files) {
    if ((files?.length ?? 0) > MAX_PHOTOS) throw new HttpError(400, `An entry can have at most ${MAX_PHOTOS} photos`);
    const entry = await ExerciseEntryModel.create({
      clientId,
      exercisedAt: data.exercisedAt ?? new Date(),
      description: data.description,
      biofeedback: data.biofeedback || null,
    });
    await addPhotos(entry.id, files, 0);
    await setTags(entry.id, data.tagIds);
    return serialize(entry);
  },

  async listEntries(clientId, range = {}) {
    const exercisedAt = {};
    let hasRange = false;
    // Op.gte/Op.lte are Symbol keys — Object.keys(exercisedAt) can't see them,
    // so checking Object.keys(...).length here would always read "no range"
    // and silently drop this filter (a real bug found and fixed in Nutrition's
    // equivalent listEntries — see nutrition.service.js). Track it with a
    // plain boolean instead.
    if (range.from) { exercisedAt[Op.gte] = range.from; hasRange = true; }
    if (range.to) { exercisedAt[Op.lte] = range.to; hasRange = true; }
    const where = { clientId, ...(hasRange ? { exercisedAt } : {}) };
    const entries = await ExerciseEntryModel.findAll({
      where,
      order: [["exercised_at", "DESC"]],
      ...(range.limit ? { limit: range.limit } : {}),
    });
    const out = [];
    for (const e of entries) out.push(await serialize(e));
    return out;
  },

  async getEntry(clientId, id) {
    const entry = await ownedEntry(clientId, id);
    return serialize(entry);
  },

  // Multipart edit: text fields in rawBody, new photos in files, storageKeys of
  // existing photos to keep in keepKeys. Photos not kept are deleted; new ones
  // are appended. Total is capped at MAX_PHOTOS.
  async updateEntry(clientId, id, rawBody, files = [], keepKeys = []) {
    const entry = await ownedEntry(clientId, id);
    const data = editEntrySchema.parse(rawBody);
    if (data.biofeedback === "") data.biofeedback = null;

    const existing = await photosFor(id);
    const keep = new Set(keepKeys);
    const kept = existing.filter((p) => keep.has(p.storageKey));
    const toDelete = existing.filter((p) => !keep.has(p.storageKey));
    if (kept.length + (files?.length ?? 0) > MAX_PHOTOS) {
      throw new HttpError(400, `An entry can have at most ${MAX_PHOTOS} photos`);
    }

    for (const p of toDelete) {
      await deleteObject(p.storageKey);
      await deleteObject(p.thumbKey);
      await p.destroy();
    }
    for (let i = 0; i < kept.length; i++) {
      if (kept[i].position !== i) await kept[i].update({ position: i });
    }
    await addPhotos(id, files, kept.length);

    if (data.tagIds) await setTags(id, data.tagIds);
    const { tagIds, ...entryFields } = data;
    await entry.update(entryFields);
    return serialize(entry);
  },

  // Hard-delete: removes the entry row, its tag links, its photo rows, and the
  // stored objects.
  async deleteEntry(clientId, id) {
    const entry = await ownedEntry(clientId, id);
    const photos = await photosFor(id);
    for (const p of photos) {
      await deleteObject(p.storageKey);
      await deleteObject(p.thumbKey);
      await p.destroy();
    }
    await ExerciseEntryTagModel.destroy({ where: { entryId: id } });
    await entry.destroy();
  },

  // Returns the storage key if the requester may read it (the owning client, or
  // a coach linked to the entry's client), else throws.
  async photoAccess(requester, key) {
    const photo = await ExercisePhotoModel.findOne({ where: { [key.startsWith("exercise-thumbs/") ? "thumbKey" : "storageKey"]: key } });
    if (!photo) throw new HttpError(404, "Photo not found");
    const entry = await ExerciseEntryModel.findByPk(photo.entryId);
    if (!entry) throw new HttpError(404, "Photo not found");
    if (requester.role === "client") {
      if (entry.clientId !== requester.sub) throw new HttpError(403, "Forbidden");
    } else {
      const link = await CoachClientModel.findOne({ where: { coachId: requester.sub, clientId: entry.clientId } });
      if (!link) throw new HttpError(403, "Forbidden");
    }
    return key;
  },

  // Year: distinct trained days this year ÷ days elapsed this year.
  // Week: distinct trained days this week ÷ days elapsed this week (Monday start).
  // weeklyChart: one { week, days } entry per elapsed week of the year so far —
  // same shape as the mockup's getWeeklyChartData().
  async stats(clientId) {
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const entries = await ExerciseEntryModel.findAll({
      where: { clientId, exercisedAt: { [Op.gte]: yearStart, [Op.lte]: now } },
    });
    const trainedDays = new Set(entries.map((e) => dayKey(e.exercisedAt)));
    const yearElapsedDays = Math.floor((now - yearStart) / 86400000) + 1;
    const yearTrainedDays = trainedDays.size;

    const weekStart = new Date(now);
    const dow = (weekStart.getDay() + 6) % 7; // Monday = 0
    weekStart.setDate(weekStart.getDate() - dow);
    weekStart.setHours(0, 0, 0, 0);
    const weekElapsedDays = Math.floor((now - weekStart) / 86400000) + 1;
    const weekTrainedDays = [...trainedDays].filter((d) => new Date(`${d}T00:00:00`) >= weekStart).length;

    const weeksNeeded = Math.ceil(yearElapsedDays / 7);
    const weeklyChart = [];
    for (let week = 1; week <= weeksNeeded; week++) {
      const wStart = new Date(yearStart);
      wStart.setDate(yearStart.getDate() + (week - 1) * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 6);
      const days = [...trainedDays].filter((d) => {
        const dt = new Date(`${d}T00:00:00`);
        return dt >= wStart && dt <= wEnd;
      }).length;
      weeklyChart.push({ week, days });
    }

    return { yearTrainedDays, yearElapsedDays, weekTrainedDays, weekElapsedDays, weeklyChart };
  },

  // Idempotent: safe to call on every server boot (findOrCreate by name).
  async ensureSystemTags() {
    for (const tag of SYSTEM_EXERCISE_TAGS) {
      await ExerciseTagModel.findOrCreate({ where: { name: tag.name }, defaults: { ...tag, isSystem: true } });
    }
  },

  async listTags() {
    const tags = await ExerciseTagModel.findAll({ order: [["is_system", "DESC"], ["name", "ASC"]] });
    return tags.map(serializeTag);
  },

  async createTag(data) {
    const existing = await ExerciseTagModel.findOne({ where: { name: data.name } });
    if (existing) throw new HttpError(409, "A tag with this name already exists");
    const tag = await ExerciseTagModel.create({ name: data.name, color: data.color, isSystem: false });
    return serializeTag(tag);
  },

  async deleteTag(id) {
    const tag = await ExerciseTagModel.findByPk(id);
    if (!tag) throw new HttpError(404, "Tag not found");
    if (tag.isSystem) throw new HttpError(409, "System tags can't be deleted");
    const inUse = await ExerciseEntryTagModel.findOne({ where: { tagId: id } });
    if (inUse) throw new HttpError(409, "Tag is in use by existing entries");
    await tag.destroy();
  },
};
