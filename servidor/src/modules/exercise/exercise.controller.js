import { exerciseService } from "./exercise.service.js";
import { listQuerySchema, statsQuerySchema, createTagSchema, updateTagSchema } from "./exercise.schema.js";
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
    try { res.json(await exerciseService.stats(req.user.sub, statsQuerySchema.parse(req.query))); }
    catch (err) { next(err); }
  },
  async usedTags(req, res, next) {
    try { res.json(await exerciseService.usedTagIds(req.user.sub)); }
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

// Coach acting on a specific client's entries (ownership verified per request).
export const coachExerciseController = {
  async list(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.listEntries(req.params.clientId, listQuerySchema.parse(req.query)));
    } catch (err) { next(err); }
  },
  async create(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.status(201).json(await exerciseService.createEntry(req.params.clientId, req.body, req.files));
    } catch (err) { next(err); }
  },
  async get(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.getEntry(req.params.clientId, req.params.id));
    } catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      const keep = [].concat(req.body?.keep ?? []);
      res.json(await exerciseService.updateEntry(req.params.clientId, req.params.id, req.body, req.files, keep));
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      await exerciseService.deleteEntry(req.params.clientId, req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
  async stats(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.stats(req.params.clientId, statsQuerySchema.parse(req.query)));
    } catch (err) { next(err); }
  },
  async usedTags(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.usedTagIds(req.params.clientId));
    } catch (err) { next(err); }
  },
  // Same full access as entries above (see the coachExerciseRouter comment
  // in exercise.route.js) — a coach can list/create/edit/delete tags for any
  // of their own approved clients, not just their own "ME" pseudo-client.
  async listTags(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.listTags(req.params.clientId));
    } catch (err) { next(err); }
  },
  async createTag(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.status(201).json(await exerciseService.createTag(req.params.clientId, createTagSchema.parse(req.body)));
    } catch (err) { next(err); }
  },
  async updateTag(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await exerciseService.updateTag(req.params.clientId, req.params.id, updateTagSchema.parse(req.body)));
    } catch (err) { next(err); }
  },
  async removeTag(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      await exerciseService.deleteTag(req.params.clientId, req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
};

export const tagsController = {
  async list(req, res, next) {
    try { res.json(await exerciseService.listTags(req.user.sub)); } catch (err) { next(err); }
  },
  async create(req, res, next) {
    try { res.status(201).json(await exerciseService.createTag(req.user.sub, createTagSchema.parse(req.body))); }
    catch (err) { next(err); }
  },
  async update(req, res, next) {
    try { res.json(await exerciseService.updateTag(req.user.sub, req.params.id, updateTagSchema.parse(req.body))); }
    catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { await exerciseService.deleteTag(req.user.sub, req.params.id); res.status(204).end(); }
    catch (err) { next(err); }
  },
};
