import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class MealPlanItemModel extends Model {}

MealPlanItemModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    planId: { type: DataTypes.UUID, allowNull: false },
    category: { type: DataTypes.ENUM("Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"), allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    dayOfWeek: { type: DataTypes.SMALLINT, allowNull: true },   // 0=Sun..6=Sat
    specificDate: { type: DataTypes.DATEONLY, allowNull: true },
  },
  { sequelize, tableName: "meal_plan_items", underscored: true },
);
