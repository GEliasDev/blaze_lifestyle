import { sequelize, dedupeUniqueConstraints } from "./lib/db.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { adminService } from "./modules/admin/admin.service.js";
import { coachingService } from "./modules/coaching/coaching.service.js";

// Importing createApp pulls in the route → controller → service → model graph,
// which registers every Sequelize model before we sync.
const app = createApp();

// NOTE: sync({ alter: true }) creates tables if missing and adds new columns to
// the existing dev DB without dropping data. It does NOT safely handle column
// renames or type changes — a proper migration tool (umzug/sequelize-cli) is
// planned for production.
await sequelize.authenticate();
await sequelize.sync({ alter: true });
// See dedupeUniqueConstraints's own comment in lib/db.js — sync({alter:true})
// re-adds a duplicate UNIQUE constraint on every boot for any inline
// `unique: true` column; this runs after every sync to clean that up so it
// can never silently reaccumulate across restarts/deploys again.
await dedupeUniqueConstraints();
// Not seeding SYSTEM_EXERCISE_TAGS on boot anymore — the user wants a clean
// tag slate (no defaults) until they explicitly ask for some back. The
// function/constant are still there (exercise.service.js/shared/enums.js),
// just not called, so this is easy to re-enable later.
await adminService.ensureModuleFlags();
await coachingService.ensureSelfClients();

app.listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
