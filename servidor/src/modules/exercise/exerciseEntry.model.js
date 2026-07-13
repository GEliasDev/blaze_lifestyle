import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";
import { EXERCISE_FEELINGS } from "../../shared/index.js";

// Free-form workout log: no assigned plan (unlike Nutrition). Tags and photos
// live in separate join/child tables — see exerciseEntryTag.model.js and
// exercisePhoto.model.js.
export class ExerciseEntryModel extends Model {}

ExerciseEntryModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    clientId: { type: DataTypes.UUID, allowNull: false },
    exercisedAt: { type: DataTypes.DATE, allowNull: false },
    // defaultValue only backfills pre-existing rows the day this column is
    // added (sequelize.sync({ alter: true }) needs one to ALTER a NOT NULL
    // column into a non-empty table) — the schema always requires a real
    // title from the client on create, so new rows never see it.
    title: { type: DataTypes.STRING, allowNull: false, defaultValue: "Workout" },
    description: { type: DataTypes.TEXT, allowNull: false },
    biofeedback: { type: DataTypes.TEXT, allowNull: true },
    // How the client felt before/during/after the workout — paired with the
    // free-text biofeedback above as a quick sad/neutral/happy pick.
    feeling: { type: DataTypes.ENUM(...EXERCISE_FEELINGS), allowNull: true },
    // Pain/injury/"flag this for the coach" signal — surfaced as a warning
    // icon everywhere the entry is listed, same convention as Nutrition's
    // hasSymptoms (see mealEntry.model.js).
    hasAlert: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    alertNote: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, tableName: "exercise_entries", underscored: true },
);
