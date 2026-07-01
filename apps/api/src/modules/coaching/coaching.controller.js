import { coachingService } from "./coaching.service.js";

export const coachingController = {
  async listClients(req, res, next) {
    try { res.json(await coachingService.listClients(req.user.sub)); } catch (err) { next(err); }
  },
};
