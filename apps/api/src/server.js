import { sequelize } from "./lib/db.js";
import { createApp } from "./app.js";
import { config } from "./config.js";

// Importing createApp pulls in the route → controller → service → model graph,
// which registers every Sequelize model before we sync.
const app = createApp();

// NOTE: sync() creates tables if missing. It does NOT safely evolve a populated
// schema — a proper migration tool (umzug/sequelize-cli) is planned for a later phase.
await sequelize.authenticate();
await sequelize.sync();

app.listen(config.port, () => {
  console.log(`API listening on :${config.port}`);
});
