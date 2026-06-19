import { authService } from "./auth.service.js";

export const authController = {
  async login(req, res, next) {
    try {
      res.json(await authService.login(req.body.email, req.body.password));
    } catch (err) { next(err); }
  },
};
