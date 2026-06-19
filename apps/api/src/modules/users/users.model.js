import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

export class UserModel extends Model {}

UserModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    role: { type: DataTypes.ENUM("client", "coach"), allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    locale: { type: DataTypes.ENUM("es", "en"), allowNull: false, defaultValue: "es" },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: "users", underscored: true },
);
