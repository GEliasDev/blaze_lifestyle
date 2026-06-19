import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class CoachClientModel extends Model {}

CoachClientModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coachId: { type: DataTypes.UUID, allowNull: false },
    clientId: { type: DataTypes.UUID, allowNull: false },
  },
  {
    sequelize, tableName: "coach_clients", underscored: true,
    indexes: [{ unique: true, fields: ["coach_id", "client_id"] }],
  },
);
