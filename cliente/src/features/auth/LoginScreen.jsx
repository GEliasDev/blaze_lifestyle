import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Button } from "../../components/Button.jsx";
import { BackLink } from "../../components/BackLink.jsx";

export function LoginScreen() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError(false);
    try {
      await login(email, password);
      // "/" (RoleHome) is the single source of truth for role -> destination,
      // so it doesn't drift out of sync with this screen (client/coach/superuser).
      navigate("/");
    } catch {
      setError(true);
    }
  }

  return (
    <div className="min-h-dvh relative flex items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <BackLink to="/">{t("common.back")}</BackLink>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-[430px] space-y-4">
        <Link to="/" className="block w-fit mx-auto mb-2">
          <img src="/logo-white.webp" alt="Blaze Lifestyle" className="h-28 w-auto" />
        </Link>
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
        {error && <p role="alert" className="text-danger">{t("auth.error")}</p>}
        <Button type="submit" variant="primary" className="w-full">{t("auth.login")}</Button>
        <button type="button" onClick={() => navigate("/register")} className="w-full text-sm text-ink/70 underline">{t("register.noAccount")}</button>
      </form>
    </div>
  );
}
