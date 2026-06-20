import { coachingService } from "./coaching.service.js";

export const coachingController = {
  async listClients(req, res, next) {
    try { res.json(await coachingService.listClients(req.user.sub)); } catch (err) { next(err); }
  },
  async getClient(req, res, next) {
    try { res.json(await coachingService.getClientMetrics(req.user.sub, req.params.clientId)); } catch (err) { next(err); }
  },
  async clientEntries(req, res, next) {
    try { res.json(await coachingService.listClientEntries(req.user.sub, req.params.clientId, req.query)); } catch (err) { next(err); }
  },
  async clientEntry(req, res, next) {
    try { res.json(await coachingService.getClientEntry(req.user.sub, req.params.clientId, req.params.entryId)); } catch (err) { next(err); }
  },
  async addComment(req, res, next) {
    try {
      const c = await coachingService.addComment(req.user.sub, req.params.entryId, req.body.body);
      res.status(201).json({ id: c.id, body: c.body, createdAt: c.createdAt });
    } catch (err) { next(err); }
  },
  async confirmCompliance(req, res, next) {
    try {
      const e = await coachingService.confirmCompliance(req.user.sub, req.params.entryId, req.body.coachCompliance);
      res.json({ id: e.id, coachCompliance: e.coachCompliance });
    } catch (err) { next(err); }
  },
};
