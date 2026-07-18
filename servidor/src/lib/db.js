import { Sequelize } from "sequelize";
import { config } from "../config.js";

export const sequelize = new Sequelize(config.databaseUrl, {
  dialect: "postgres",
  logging: false,
});

// sequelize.sync({ alter: true }) (see server.js) has a known limitation with
// inline `unique: true` column attributes: on every boot it re-diffs the
// table, fails to match the constraint it already created against the one it
// thinks the model needs, and adds ANOTHER identically-defined UNIQUE
// constraint under a new auto-incremented name instead of recognizing the
// existing one. Left unchecked this silently accumulates forever — one
// dev/deploy restart at a time — until a table ends up with hundreds of
// redundant constraints (found live on `users`: 212 duplicate copies each of
// UNIQUE(email) and UNIQUE(coach_code), likely from the app's entire
// development history). Grouping by (table, constraint definition) rather
// than by name is deliberate — it catches a duplicate regardless of which
// name Postgres happened to generate for it, so this is called after every
// sync() in server.js and self-heals the table back to exactly one
// constraint per unique column, indefinitely, with no growth between boots.
export async function dedupeUniqueConstraints() {
  const [constraints] = await sequelize.query(`
    SELECT conrelid::regclass::text AS tablename, conname, pg_get_constraintdef(oid) AS def
    FROM pg_constraint
    WHERE contype = 'u' AND connamespace = 'public'::regnamespace
    ORDER BY tablename, def, conname
  `);
  const seen = new Set();
  for (const c of constraints) {
    const key = `${c.tablename}::${c.def}`;
    if (seen.has(key)) {
      await sequelize.query(`ALTER TABLE ${c.tablename} DROP CONSTRAINT "${c.conname}"`);
    } else {
      seen.add(key);
    }
  }
}
