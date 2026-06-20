import { MealPlanModel } from "./mealPlan.model.js";
import { MealPlanItemModel } from "./mealPlanItem.model.js";
import { assertCoachOwnsClient } from "../../lib/ownership.js";
import { HttpError } from "../../middleware/error.js";

const CATEGORIES = ["Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"];

async function loadItemForCoach(coachId, itemId) {
  const item = await MealPlanItemModel.findByPk(itemId);
  if (!item) throw new HttpError(404, "Item not found");
  const plan = await MealPlanModel.findByPk(item.planId);
  if (!plan) throw new HttpError(404, "Plan not found");
  await assertCoachOwnsClient(coachId, plan.clientId);
  return item;
}

export const mealplansService = {
  async getActivePlan(clientId) {
    const plan = await MealPlanModel.findOne({ where: { clientId, active: true } });
    if (!plan) return null;
    const items = await MealPlanItemModel.findAll({ where: { planId: plan.id } });
    return { plan, items };
  },

  async createPlan(coachId, clientId, { name, startDate }) {
    await assertCoachOwnsClient(coachId, clientId);
    await MealPlanModel.update({ active: false }, { where: { clientId, active: true } });
    return MealPlanModel.create({ coachId, clientId, name, startDate, active: true });
  },

  async addItem(coachId, planId, data) {
    const plan = await MealPlanModel.findByPk(planId);
    if (!plan) throw new HttpError(404, "Plan not found");
    await assertCoachOwnsClient(coachId, plan.clientId);
    return MealPlanItemModel.create({ planId, ...data });
  },

  async updateItem(coachId, itemId, data) {
    const item = await loadItemForCoach(coachId, itemId);
    return item.update(data);
  },

  async deleteItem(coachId, itemId) {
    const item = await loadItemForCoach(coachId, itemId);
    await item.destroy();
  },

  // Returns one row per category for the given date, choosing a date-specific
  // item over the weekday item.
  async resolveForDate(clientId, dateStr) {
    const active = await this.getActivePlan(clientId);
    if (!active) return [];
    const dow = new Date(`${dateStr}T00:00:00`).getDay(); // 0=Sun..6=Sat
    return CATEGORIES.map((category) => {
      const items = active.items.filter((i) => i.category === category);
      const dated = items.find((i) => i.specificDate === dateStr);
      const weekly = items.find((i) => i.dayOfWeek === dow);
      const chosen = dated ?? weekly;
      return chosen ? { category, itemId: chosen.id, title: chosen.title, notes: chosen.notes } : null;
    }).filter(Boolean);
  },
};
