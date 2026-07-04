import { nutritionService } from "./nutrition.service.js";
import { listQuerySchema } from "./nutrition.schema.js";
import { getObject } from "../../lib/storage.js";
import { assertCoachOwnsClient } from "../../lib/ownership.js";

export const nutritionController = {
  async create(req, res, next) {
    try { res.status(201).json(await nutritionService.createEntry(req.user.sub, req.body, req.files)); }
    catch (err) { next(err); }
  },
  async list(req, res, next) {
    try { res.json(await nutritionService.listEntries(req.user.sub, listQuerySchema.parse(req.query))); }
    catch (err) { next(err); }
  },
  async get(req, res, next) {
    try { res.json(await nutritionService.getEntry(req.user.sub, req.params.id)); }
    catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      const keep = [].concat(req.body?.keep ?? []);
      res.json(await nutritionService.updateEntry(req.user.sub, req.params.id, req.body, req.files, keep));
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try { await nutritionService.deleteEntry(req.user.sub, req.params.id); res.status(204).end(); }
    catch (err) { next(err); }
  },
  async photo(req, res, next) {
    try {
      const key = `${req.params.prefix}/${req.params.file}`;
      await nutritionService.photoAccess(req.user, key);
      const { body, contentType } = await getObject(key);
      res.setHeader("Content-Type", contentType);
      body.pipe(res);
    } catch (err) { next(err); }
  },
};

// Coach acting on a specific client's entries (ownership verified per request).
export const coachNutritionController = {
  async list(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await nutritionService.listEntries(req.params.clientId, listQuerySchema.parse(req.query)));
    } catch (err) { next(err); }
  },
  async create(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.status(201).json(await nutritionService.createEntry(req.params.clientId, req.body, req.files));
    } catch (err) { next(err); }
  },
  async get(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      res.json(await nutritionService.getEntry(req.params.clientId, req.params.id));
    } catch (err) { next(err); }
  },
  async update(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      const keep = [].concat(req.body?.keep ?? []);
      res.json(await nutritionService.updateEntry(req.params.clientId, req.params.id, req.body, req.files, keep));
    } catch (err) { next(err); }
  },
  async remove(req, res, next) {
    try {
      await assertCoachOwnsClient(req.user.sub, req.params.clientId);
      await nutritionService.deleteEntry(req.params.clientId, req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
};
