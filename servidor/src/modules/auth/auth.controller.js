import { authService } from "./auth.service.js";

export const authController = {
  async login(req, res, next) {
    try { res.json(await authService.login(req.body.email, req.body.password)); }
    catch (err) { next(err); }
  },
  async register(req, res, next) {
    try { res.status(201).json(await authService.register(req.body)); }
    catch (err) { next(err); }
  },
  async refresh(req, res, next) {
    try { res.json(await authService.refresh(req.body.refreshToken)); }
    catch (err) { next(err); }
  },
};
