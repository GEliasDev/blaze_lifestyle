import { accountService } from "./account.service.js";

export const accountController = {
  async getCoach(req, res, next) {
    try { res.json(await accountService.getCoach(req.user.sub)); }
    catch (err) { next(err); }
  },
  async linkCoach(req, res, next) {
    try { res.json(await accountService.linkCoach(req.user.sub, req.body.coachCode)); }
    catch (err) { next(err); }
  },
};
