import { adminService } from "./admin.service.js";
import { setModuleFlagSchema } from "./admin.schema.js";
import { APP_ENVIRONMENTS } from "../../shared/index.js";

export const adminController = {
  async listModuleFlags(req, res, next) {
    try {
      const environment = APP_ENVIRONMENTS.includes(req.query.env) ? req.query.env : "production";
      res.json(await adminService.listModuleFlags(environment));
    } catch (err) { next(err); }
  },
  async setModuleFlag(req, res, next) {
    try {
      const { enabled, environment } = setModuleFlagSchema.parse(req.body);
      res.json(await adminService.setModuleFlag(req.params.key, environment, enabled));
    } catch (err) { next(err); }
  },
};
