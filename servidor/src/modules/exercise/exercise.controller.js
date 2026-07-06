import { exerciseService } from "./exercise.service.js";
import { listQuerySchema, createTagSchema } from "./exercise.schema.js";
import { getObject } from "../../lib/storage.js";
import { assertCoachOwnsClient } from "../../lib/ownership.js";

export const exerciseController = {
  async create(req, res, next) {
    try { res.status(201).json(await exerciseService.createEntry(req.user.sub, req.body, req.files)); }
    catch (err) { next(err); }
  },
  async list(req, res, next) {
    try { res.json(await exerciseService.listEntries(req.user.sub, listQuerySchema.parse(req.query))); }
    catch (err) { next(err); }
  },
  async get(req, res, next) {
    try { res.json(await exerciseService.getEntry(req.user.sub, req.params.id)); }
    catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      const keep = [].concat(req.body?.keep ?? []);
      res.json(await exerciseService.updateEntry(req.user.sub, req.params.id, req.body, req.files, keep));
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { await exerciseService.deleteEntry(req.user.sub, req.params.id); res.status(204).end(); }
    catch (err) { next(err); }
  },
  async stats(req, res, next) {
    try { res.json(await exerciseService.stats(req.user.sub)); }
    catch (err) { next(err); }
  },
  async photo(req, res, next) {
    try {
      const key = `${req.params.prefix}/${req.params.file}`;
      await exerciseService.photoAccess(req.user, key);
      const { body, contentType } = await getObject(key);
      res.setHeader("Content-Type", contentType);
      body.pipe(res);
    } catch (err) { next(err); }
  },
};

// Coach acting on a specific client's entries (ownership verified per request, read-only).
export const coachExerciseController = {
  async list(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.listEntries(req.params.clientId, listQuerySchema.parse(req.query)));
    } catch (err) { next(err); }
  },
  async get(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.getEntry(req.params.clientId, req.params.id));
    } catch (err) { next(err); }
  },
  async stats(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.stats(req.params.clientId));
    } catch (err) { next(err); }
  },
};

// Tags are global (not client-scoped) — any authenticated user can list, only a coach can write.
export const tagsController = {
  async list(req, res, next) {
    try { res.json(await exerciseService.listTags()); } catch (err) { next(err); }
  },
  async create(req, res, next) {
    try { res.status(201).json(await exerciseService.createTag(createTagSchema.parse(req.body))); }
    catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { await exerciseService.deleteTag(req.params.id); res.status(204).end(); }
    catch (err) { next(err); }
  },
};
