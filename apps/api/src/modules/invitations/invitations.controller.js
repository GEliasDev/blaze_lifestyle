import { invitationsService } from "./invitations.service.js";

export const invitationsController = {
  async create(req, res, next) {
    try {
      const inv = await invitationsService.create(req.user.sub, req.body.email);
      res.status(201).json({ id: inv.id, token: inv.token, email: inv.email });
    } catch (err) { next(err); }
  },
  async preview(req, res, next) {
    try { res.json(await invitationsService.preview(req.params.token)); }
    catch (err) { next(err); }
  },
  async accept(req, res, next) {
    try {
      res.status(201).json(await invitationsService.accept(req.params.token, req.body.name, req.body.password));
    } catch (err) { next(err); }
  },
};
