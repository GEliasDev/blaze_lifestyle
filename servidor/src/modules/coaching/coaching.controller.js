import { coachingService } from "./coaching.service.js";
import { setClientStatusSchema, setNicknameSchema } from "./coaching.schema.js";

export const coachingController = {
  async listClients(req, res, next) {
    try { res.json(await coachingService.listClients(req.user.sub)); } catch (err) { next(err); }
  },
  async getMetrics(req, res, next) {
    try { res.json(await coachingService.getMetrics(req.user.sub, req.params.clientId)); } catch (err) { next(err); }
  },
  async setClientStatus(req, res, next) {
    try {
      const { status } = setClientStatusSchema.parse(req.body);
      res.json(await coachingService.setClientStatus(req.user.sub, req.params.clientId, status));
    } catch (err) { next(err); }
  },
  async setNickname(req, res, next) {
    try {
      const { nickname } = setNicknameSchema.parse(req.body);
      res.json(await coachingService.setNickname(req.user.sub, req.params.clientId, nickname));
    } catch (err) { next(err); }
  },
};
