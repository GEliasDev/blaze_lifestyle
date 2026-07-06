import { sequelize } from "./lib/db.js";
import { createApp } from "./app.js";
import { config } from "./config.js";
import { exerciseService } from "./modules/exercise/exercise.service.js";

// Importing createApp pulls in the route → controller → service → model graph,
// which registers every Sequelize model before we sync.
const app = createApp();

// NOTE: sync({ alter: true }) creates tables if missing and adds new columns to
// the existing dev DB without dropping data. It does NOT safely handle column
// renames or type changes — a proper migration tool (umzug/sequelize-cli) is
// planned for production.
await sequelize.authenticate();
await sequelize.sync({ alter: true });
await exerciseService.ensureSystemTags();

app.listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
