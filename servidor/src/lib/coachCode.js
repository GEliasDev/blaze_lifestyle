import { randomInt } from "node:crypto";
import { UserModel } from "../modules/users/users.model.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0/I/1

export function generateCoachCode(len = 6) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

export async function uniqueCoachCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateCoachCode();
    if (!(await UserModel.findOne({ where: { coachCode: code } }))) return code;
  }
  throw new Error("Could not generate a unique coach code");
}
