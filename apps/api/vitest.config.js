import { defineConfig } from "vitest/config";

// API integration tests share a single PostgreSQL database and each suite
// resets it with `sequelize.sync({ force: true })`. Running test files in
// parallel makes those resets clobber each other (e.g. dropping enum types
// mid-query). Force serial execution so each suite owns the DB while it runs.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
