import { mealplansService } from "./mealplans.service.js";

export const mealplansController = {
  async createPlan(req, res, next) {
    try {
      const plan = await mealplansService.createPlan(req.user.sub, req.params.clientId, req.body);
      res.status(201).json({ id: plan.id, name: plan.name, startDate: plan.startDate, active: plan.active });
    } catch (err) { next(err); }
  },
  async getClientPlan(req, res, next) {
    try { res.json(await mealplansService.getActivePlan(req.params.clientId)); }
    catch (err) { next(err); }
  },
  async addItem(req, res, next) {
    try { res.status(201).json(await mealplansService.addItem(req.user.sub, req.params.planId, req.body)); }
    catch (err) { next(err); }
  },
  async updateItem(req, res, next) {
    try { res.json(await mealplansService.updateItem(req.user.sub, req.params.itemId, req.body)); }
    catch (err) { next(err); }
  },
  async deleteItem(req, res, next) {
    try { await mealplansService.deleteItem(req.user.sub, req.params.itemId); res.status(204).end(); }
    catch (err) { next(err); }
  },
  async myPlan(req, res, next) {
    try { res.json(await mealplansService.getActivePlan(req.user.sub)); }
    catch (err) { next(err); }
  },
  async myToday(req, res, next) {
    try { res.json(await mealplansService.resolveForDate(req.user.sub, req.query.date)); }
    catch (err) { next(err); }
  },
};
