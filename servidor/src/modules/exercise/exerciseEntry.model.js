import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// Free-form workout log: no assigned plan (unlike Nutrition). Tags and photos
// live in separate join/child tables — see exerciseEntryTag.model.js and
// exercisePhoto.model.js.
export class ExerciseEntryModel extends Model {}

ExerciseEntryModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    clientId: { type: DataTypes.UUID, allowNull: false },
    exercisedAt: { type: DataTypes.DATE, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    biofeedback: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: "exercise_entries", underscored: true },
);
