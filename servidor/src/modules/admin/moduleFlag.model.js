import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";

// One row per MODULE_KEYS entry (see shared/enums.js) — the superuser panel
// flips `enabled`; the client/coach app reads it to decide whether a module
// renders its real screens or the "working on it" placeholder.
export class ModuleFlagModel extends Model {}

ModuleFlagModel.init(
  {
    key: { type: DataTypes.STRING, primaryKey: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { sequelize, tableName: "module_flags", underscored: true },
);
