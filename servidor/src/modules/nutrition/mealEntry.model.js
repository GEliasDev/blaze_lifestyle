import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";
import { MEAL_CATEGORIES, COMPLIANCE } from "../../shared/index.js";

// Free-form meal log: the client chooses the category and the meal-guide
// compliance themselves (no assigned plan in this flow). Description and
// digestive symptoms are optional and edited from the entry detail screen.
export class MealEntryModel extends Model {}

MealEntryModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    clientId: { type: DataTypes.UUID, allowNull: false },
    category: { type: DataTypes.ENUM(...MEAL_CATEGORIES), allowNull: false },
    eatenAt: { type: DataTypes.DATE, allowNull: false },
    compliance: { type: DataTypes.ENUM(...COMPLIANCE), allowNull: false, defaultValue: "na" },
    description: { type: DataTypes.TEXT, allowNull: true },
    hasSymptoms: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    symptomDescription: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: "meal_entries", underscored: true },
);
