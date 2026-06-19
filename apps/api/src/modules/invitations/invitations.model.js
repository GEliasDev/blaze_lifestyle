import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class InvitationModel extends Model {}

InvitationModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coachId: { type: DataTypes.UUID, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    token: { type: DataTypes.STRING, allowNull: false, unique: true },
    status: { type: DataTypes.ENUM("pending", "accepted", "expired"), allowNull: false, defaultValue: "pending" },
    expiresAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, tableName: "invitations", underscored: true },
);
