import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// isSystem=true for the 14 seeded tags (see shared/enums.js SYSTEM_EXERCISE_TAGS) — those can never
// be deleted. Custom tags (isSystem=false) are created/deleted by a coach only.
export class ExerciseTagModel extends Model {}

ExerciseTagModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    color: { type: DataTypes.STRING, allowNull: false },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { sequelize, tableName: "exercise_tags", underscored: true },
);
