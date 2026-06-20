import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class CoachCommentModel extends Model {}

CoachCommentModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    entryId: { type: DataTypes.UUID, allowNull: false },
    coachId: { type: DataTypes.UUID, allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    readByClientAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, tableName: "coach_comments", underscored: true },
);
