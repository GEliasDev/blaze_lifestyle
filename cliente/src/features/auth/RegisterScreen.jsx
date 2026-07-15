import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Button } from "../../components/Button.jsx";
import { BackLink } from "../../components/BackLink.jsx";

const field = "w-full p-3 border-2 border-ink rounded-none";

// Client-only now — coaches no longer self-register through this form (see
// registerSchema in servidor/src/shared/schemas.js). A coach code is
// mandatory: every new client starts "pending" on that coach's Clients list
// until accepted (see RequireApprovedClient in app/router.jsx).
export function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", coachCode: "" });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      await register({ name: form.name, email: form.email, password: form.password, role: "client", coachCode: form.coachCode });
      navigate("/nutrition");
    } catch (err) {
      setError(err.message || "error");
    }
  }

  return (
    <div className="h-dvh overflow-y-auto relative flex items-center justify-center p-4">
      <div className="fixed top-4 left-4 z-10">
        <BackLink to="/">{t("common.back")}</BackLink>
      </div>
      <form onSubmit={onSubmit} className="w-full max-w-[430px] space-y-4">
        <Link to="/" className="block w-fit mx-auto mb-2">
          <img src="/logo-white.webp" alt="Blaze Lifestyle" className="h-28 w-auto" />
        </Link>
        <h1 className="font-heading uppercase tracking-wide text-2xl">{t("register.title")}</h1>
        <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("register.name")}</span>
          <input aria-label={t("register.name")} value={form.name} onChange={set("name")} className={field} required /></label>
        <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("auth.email")}</span>
          <input aria-label={t("auth.email")} type="email" value={form.email} onChange={set("email")} className={field} required /></label>
        <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("auth.password")}</span>
          <input aria-label={t("auth.password")} type="password" value={form.password} onChange={set("password")} className={field} required minLength={8} /></label>
        <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("register.coachCode")}</span>
          <input aria-label={t("register.coachCode")} value={form.coachCode} onChange={set("coachCode")} className={field} required /></label>
        {error && <p role="alert" className="text-danger">{error}</p>}
        <Button type="submit" variant="primary" className="w-full">{t("register.submit")}</Button>
        <button type="button" onClick={() => navigate("/login")} className="w-full text-sm text-ink/70 underline">{t("register.haveAccount")}</button>
      </form>
    </div>
  );
}
