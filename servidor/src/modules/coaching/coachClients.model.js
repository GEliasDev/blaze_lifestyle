import { DataTypes, Model } from "sequelize";
import { sequelize } from "../../lib/db.js";
import { COACH_CLIENT_STATUS } from "../../shared/index.js";

export class CoachClientModel extends Model {}

CoachClientModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    coachId: { type: DataTypes.UUID, allowNull: false },
    clientId: { type: DataTypes.UUID, allowNull: false },
    // defaultValue "approved" backfills pre-existing rows (links created
    // before this column existed) so they aren't retroactively gated — new
    // links explicitly pass status: "pending" at creation time instead (see
    // auth.service.js register() and account.service.js linkCoach()).
    status: { type: DataTypes.ENUM(...COACH_CLIENT_STATUS), allowNull: false, defaultValue: "approved" },
    // Coach-only display name for this client — lives on the link, not the
    // client's own account, since it's how *this* coach recognizes them, not
    // a real identity change. Null means "just show their real name".
    nickname: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize, tableName: "coach_clients", underscored: true,
    indexes: [
      { unique: true, fields: ["coach_id", "client_id"] },
      { unique: true, fields: ["client_id"] },
    ],
  },
);
