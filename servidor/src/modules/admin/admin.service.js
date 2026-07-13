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

  async listModuleFlags(environment) {
    const flags = await ModuleFlagModel.findAll({ where: { environment }, order: [["key", "ASC"]] });
    return flags.map((f) => ({ key: f.key.split(":")[0], enabled: f.enabled }));
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
