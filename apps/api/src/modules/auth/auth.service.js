import { UserModel } from "../users/users.model.js";
import { verifyPassword } from "../../lib/password.js";
import { signAccess, signRefresh } from "../../lib/jwt.js";
import { HttpError } from "../../middleware/error.js";

function toUser(m) {
  return { id: m.id, role: m.role, email: m.email, name: m.name, locale: m.locale, active: m.active };
}

export const authService = {
  async login(email, password) {
    const user = await UserModel.findOne({ where: { email } });
    if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, "Invalid credentials");
    }
    const payload = { sub: user.id, role: user.role };
    return { accessToken: signAccess(payload), refreshToken: signRefresh(payload), user: toUser(user) };
  },
  toUser,
};
