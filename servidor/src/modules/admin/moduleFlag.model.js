import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// One row per (MODULE_KEYS x APP_ENVIRONMENTS) combo — see shared/enums.js.
// `key` stays a plain STRING primary key (keeps the original column's role
// unchanged so `sync({ alter: true })` only ever needs a safe ADD COLUMN,
// never a primary-key restructure) but now holds a composite value like
// "nutrition:production"; `environment` is a separate column purely so
// listModuleFlags() can filter without parsing that string apart.
export class ModuleFlagModel extends Model {}

ModuleFlagModel.init(
  {
    key: { type: DataTypes.STRING, primaryKey: true },
    environment: { type: DataTypes.STRING, allowNull: false, defaultValue: "production" },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: "module_flags", underscored: true },
);
