import { ModuleFlagModel } from "./moduleFlag.model.js";
import { MODULE_KEYS, APP_ENVIRONMENTS } from "../../shared/index.js";
import { HttpError } from "../../middleware/error.js";

const compositeKey = (moduleKey, environment) => `${moduleKey}:${environment}`;

export const adminService = {
  // Idempotent: safe to call on every server boot (findOrCreate by key).
  async ensureModuleFlags() {
    for (const moduleKey of MODULE_KEYS) {
      for (const environment of APP_ENVIRONMENTS) {
        await ModuleFlagModel.findOrCreate({
          where: { key: compositeKey(moduleKey, environment) },
          defaults: { environment, enabled: true },
        });
      }
    }
  },

  // Filters by parsing the ":<environment>" suffix off `key` directly, rather
  // than trusting the separate `environment` column — the column can drift
  // out of sync with the key it's supposed to describe (a real bug found in
  // production: every row's `environment` ended up "production" regardless
  // of its key), whereas the key itself is the one value nothing can corrupt
  // after the row's been created.
  async listModuleFlags(environment) {
    const suffix = `:${environment}`;
    const flags = await ModuleFlagModel.findAll({ order: [["key", "ASC"]] });
    return flags.filter((f) => f.key.endsWith(suffix)).map((f) => ({ key: f.key.slice(0, -suffix.length), enabled: f.enabled }));
  },

  async setModuleFlag(moduleKey, environment, enabled) {
    if (!MODULE_KEYS.includes(moduleKey)) throw new HttpError(404, "Unknown module");
    if (!APP_ENVIRONMENTS.includes(environment)) throw new HttpError(400, "Unknown environment");
    const key = compositeKey(moduleKey, environment);
    const [flag] = await ModuleFlagModel.findOrCreate({ where: { key }, defaults: { environment, enabled } });
    if (flag.enabled !== enabled) await flag.update({ enabled });
    return { key: moduleKey, environment, enabled: flag.enabled };
  },
};
