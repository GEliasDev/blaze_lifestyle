import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Button } from "../../components/Button.jsx";

export function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const user = await login(email, password);
      navigate(user.role === "coach" ? "/coach" : "/home");
    } catch {
      setError("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[430px] p-4 space-y-4">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("auth.login")}</h1>
      <label className="block">
        <span className="font-heading uppercase text-sm">{t("auth.email")}</span>
        <input aria-label={t("auth.email")} type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border-2 border-ink rounded-none" />
      </label>
      <label className="block">
        <span className="font-heading uppercase text-sm">{t("auth.password")}</span>
        <input aria-label={t("auth.password")} type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border-2 border-ink rounded-none" />
      </label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t("auth.login")}</Button>
      <button type="button" onClick={() => navigate("/register")} className="w-full text-sm text-ink/70 underline">{t("register.noAccount")}</button>
    </form>
  );
}
