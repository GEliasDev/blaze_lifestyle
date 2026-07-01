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
  async getProfile(req, res, next) {
    try { res.json(await accountService.getProfile(req.user.sub)); }
    catch (err) { next(err); }
  },
  async updateProfile(req, res, next) {
    try { res.json(await accountService.updateProfile(req.user.sub, req.body)); }
    catch (err) { next(err); }
  },
  async changePassword(req, res, next) {
    try { res.json(await accountService.changePassword(req.user.sub, req.body)); }
    catch (err) { next(err); }
  },
};
