import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// isSystem=true for the 14 seeded tags (see shared/enums.js SYSTEM_EXERCISE_TAGS) — those can never
// be deleted, are shared by everyone (clientId null), and stay globally unique by name.
// Custom tags (isSystem=false) are created/edited/deleted by their owning client only (each client
// has their own private tag set — see exercise.service.js listTags). clientId is nullable rather
// than a hard FK-required column so `sync({ alter: true })` can safely ADD COLUMN on an existing
// table. This column replaces an earlier coachId (tags used to be per-coach, shared across all of a
// coach's clients) — sync({alter:true}) doesn't rename a column, it drops the one no longer in the
// model and adds the new one, so any custom tag from that era lost its old coach_id value and got
// clientId backfilled to null. listTags treats a null-clientId non-system tag as belonging to no one
// (excluded from every client's list) rather than shown as shared, since there's no record left of
// which client it should now belong to.
export class ExerciseTagModel extends Model {}

ExerciseTagModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    color: { type: DataTypes.STRING, allowNull: false },
    isSystem: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    clientId: { type: DataTypes.UUID, allowNull: true },
  },
  { sequelize, tableName: "exercise_tags", underscored: true },
);
