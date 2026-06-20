import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class MealEntryModel extends Model {}

MealEntryModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    clientId: { type: DataTypes.UUID, allowNull: false },
    planItemId: { type: DataTypes.UUID, allowNull: true },
    category: { type: DataTypes.ENUM("Breakfast", "AM Snack", "Lunch", "PM Snack", "Dinner", "Supplement"), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    eatenAt: { type: DataTypes.DATE, allowNull: false },
    hasSymptoms: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    symptomDescription: { type: DataTypes.TEXT, allowNull: true },
    clientCompliance: { type: DataTypes.ENUM("yes", "no", "na"), allowNull: false, defaultValue: "na" },
    coachCompliance: { type: DataTypes.ENUM("yes", "no"), allowNull: true },
    coachComplianceAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: "meal_entries", underscored: true },
);
