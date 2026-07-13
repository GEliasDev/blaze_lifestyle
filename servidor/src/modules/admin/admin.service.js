import { ModuleFlagModel } from "./moduleFlag.model.js";
import { MODULE_KEYS } from "../../shared/index.js";
import { HttpError } from "../../middleware/error.js";

export const adminService = {
  // Idempotent: safe to call on every server boot (findOrCreate by key).
  async ensureModuleFlags() {
    for (const key of MODULE_KEYS) {
      await ModuleFlagModel.findOrCreate({ where: { key }, defaults: { enabled: true } });
    }
  },

  async listModuleFlags() {
    const flags = await ModuleFlagModel.findAll({ order: [["key", "ASC"]] });
    return flags.map((f) => ({ key: f.key, enabled: f.enabled }));
  },

  async setModuleFlag(key, enabled) {
    if (!MODULE_KEYS.includes(key)) throw new HttpError(404, "Unknown module");
    const [flag] = await ModuleFlagModel.findOrCreate({ where: { key }, defaults: { enabled } });
    if (flag.enabled !== enabled) await flag.update({ enabled });
    return { key: flag.key, enabled: flag.enabled };
  },
};
