import { nutritionService } from "./nutrition.service.js";
import { getObject } from "../../lib/storage.js";

export const nutritionController = {
  async create(req, res, next) {
    try { res.status(201).json(await nutritionService.createEntry(req.user.sub, req.body, req.files)); }
    catch (err) { next(err); }
  },
  async list(req, res, next) {
    try { res.json(await nutritionService.listEntries(req.user.sub, req.query)); }
    catch (err) { next(err); }
  },
  async get(req, res, next) {
    try { res.json(await nutritionService.getEntryForOwner(req.user.sub, req.params.id)); }
    catch (err) { next(err); }
  },
  async update(req, res, next) {
    try { res.json(await nutritionService.updateEntry(req.user.sub, req.params.id, req.body)); }
    catch (err) { next(err); }
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
