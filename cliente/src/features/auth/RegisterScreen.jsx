import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../lib/auth.jsx";
import { Button } from "../../components/Button.jsx";

const field = "w-full p-3 border-2 border-ink rounded-none";

export function RegisterScreen() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "client", coachCode: "" });
  const [error, setError] = useState(null);
  const [coachCode, setCoachCode] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
      if (form.role === "client" && form.coachCode) payload.coachCode = form.coachCode;
      const user = await register(payload);
      if (user.role === "coach") setCoachCode(user.coachCode);
      else navigate("/nutrition");
    } catch (err) {
      setError(err.message || "error");
    }
  }

  if (coachCode) {
    return (
      <div className="mx-auto max-w-[430px] p-6 space-y-4 text-center">
        <h1 className="font-heading uppercase tracking-wide text-2xl">{t("register.yourCode")}</h1>
        <div className="border-2 border-primary text-primary font-heading text-3xl tracking-[0.3em] py-4">{coachCode}</div>
        <p className="text-ink/70 text-sm">{t("register.shareCode")}</p>
        <Button variant="primary" className="w-full" onClick={() => navigate("/coach")}>{t("register.continue")}</Button>
      </div>
    );
  }

  const roleBtn = (value, label) => (
    <button type="button" onClick={() => setForm({ ...form, role: value })}
      className={`flex-1 min-h-[44px] border-2 font-heading uppercase tracking-wide ${form.role === value ? "bg-primary text-white border-primary" : "bg-white text-ink border-ink"}`}>
      {label}
    </button>
  );

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-[430px] p-4 space-y-4">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("register.title")}</h1>
      <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("register.name")}</span>
        <input aria-label={t("register.name")} value={form.name} onChange={set("name")} className={field} required /></label>
      <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("auth.email")}</span>
        <input aria-label={t("auth.email")} type="email" value={form.email} onChange={set("email")} className={field} required /></label>
      <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("auth.password")}</span>
        <input aria-label={t("auth.password")} type="password" value={form.password} onChange={set("password")} className={field} required minLength={8} /></label>
      <div className="space-y-1">
        <span className="font-heading uppercase text-sm">{t("register.role")}</span>
        <div className="flex gap-2">{roleBtn("client", t("register.asClient"))}{roleBtn("coach", t("register.asCoach"))}</div>
      </div>
      {form.role === "client" && (
        <label className="block space-y-1"><span className="font-heading uppercase text-sm">{t("register.coachCode")}</span>
          <input aria-label={t("register.coachCode")} value={form.coachCode} onChange={set("coachCode")} className={field} /></label>
      )}
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t("register.submit")}</Button>
      <button type="button" onClick={() => navigate("/login")} className="w-full text-sm text-ink/70 underline">{t("register.haveAccount")}</button>
    </form>
  );
}
