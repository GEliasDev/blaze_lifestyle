import { verifyAccess } from "../lib/jwt.js";
import { HttpError } from "./error.js";

export function authGuard(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return next(new HttpError(401, "Unauthorized"));
  try {
    req.user = verifyAccess(header.slice(7));
    next();
  } catch {
    next(new HttpError(401, "Unauthorized"));
  }
}

export const roleGuard = (role) => (req, _res, next) => {
  if (!req.user || req.user.role !== role) return next(new HttpError(403, "Forbidden"));
  next();
};
