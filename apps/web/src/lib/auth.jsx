import { createContext, useContext, useState } from "react";
import { api } from "./api.js";

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });

  async function persist(res) {
    localStorage.setItem("accessToken", res.accessToken);
    localStorage.setItem("refreshToken", res.refreshToken);
    localStorage.setItem("user", JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  }
  async function login(email, password) { return persist(await api.post("/auth/login", { email, password })); }
  async function register(payload) { return persist(await api.post("/auth/register", payload)); }
  function logout() {
    ["accessToken", "refreshToken", "user"].forEach((k) => localStorage.removeItem(k));
    setUser(null);
  }
  return <Ctx.Provider value={{ user, login, register, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
