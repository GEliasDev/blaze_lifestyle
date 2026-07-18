import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// isSystem=true for the 14 seeded tags (see shared/enums.js SYSTEM_EXERCISE_TAGS) — those can never
// be deleted, are shared by every coach (coachId null), and stay globally unique by name.
// Custom tags (isSystem=false) are created/edited/deleted by their owning coach only and are
// scoped to that coach + their clients — see exercise.service.js coachIdFor/listTags. coachId is
// nullable rather than a hard FK-required column so `sync({ alter: true })` can safely ADD COLUMN
// on an existing table; any custom tag that predates this column (coachId backfilled to null) is
// grandfathered in as globally visible, since there was previously no record of who created it.
export class ExerciseTagModel extends Model {}

ExerciseTagModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    color: { type: DataTypes.STRING, allowNull: false },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    coachId: { type: DataTypes.UUID, allowNull: true },
  },
  { sequelize, tableName: "exercise_tags", underscored: true },
);
