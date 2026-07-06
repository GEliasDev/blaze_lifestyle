import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class ExercisePhotoModel extends Model {}

ExercisePhotoModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    entryId: { type: DataTypes.UUID, allowNull: false },
    storageKey: { type: DataTypes.STRING, allowNull: false },
    thumbKey: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  { sequelize, tableName: "exercise_photos", underscored: true },
);
