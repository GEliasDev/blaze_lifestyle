import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// Plain many-to-many join row — queried manually in exercise.service.js, no
// Sequelize belongsToMany association (this codebase doesn't use associations
// elsewhere; see mealEntry/mealPhoto for the same manual-query convention).
export class ExerciseEntryTagModel extends Model {}

ExerciseEntryTagModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    entryId: { type: DataTypes.UUID, allowNull: false },
    tagId: { type: DataTypes.UUID, allowNull: false },
  },
  { sequelize, tableName: "exercise_entry_tags", underscored: true },
);
