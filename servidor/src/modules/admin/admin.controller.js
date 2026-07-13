import { adminService } from "./admin.service.js";
import { setModuleFlagSchema } from "./admin.schema.js";

export const adminController = {
  async listModuleFlags(req, res, next) {
    try { res.json(await adminService.listModuleFlags()); }
    catch (err) { next(err); }
  },
  async setModuleFlag(req, res, next) {
    try {
      const { enabled } = setModuleFlagSchema.parse(req.body);
      res.json(await adminService.setModuleFlag(req.params.key, enabled));
    } catch (err) { next(err); }
  },
};
