import jwt from "jsonwebtoken";
import { config } from "../config.js";

export const signAccess = (p) => jwt.sign(p, config.jwtAccessSecret, { expiresIn: "15m" });
export const signRefresh = (p) => jwt.sign(p, config.jwtRefreshSecret, { expiresIn: "30d" });
export const verifyAccess = (token) => jwt.verify(token, config.jwtAccessSecret);
export const verifyRefresh = (token) => jwt.verify(token, config.jwtRefreshSecret);
