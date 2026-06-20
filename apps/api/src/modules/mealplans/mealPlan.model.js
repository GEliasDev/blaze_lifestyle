import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class MealPlanModel extends Model {}

MealPlanModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coachId: { type: DataTypes.UUID, allowNull: false },
    clientId: { type: DataTypes.UUID, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: "meal_plans", underscored: true },
);
