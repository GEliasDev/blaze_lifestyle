import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../../lib/api.js";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";

export function ClientsScreen() {
  const { t } = useTranslation();
  const [clients, setClients] = useState(null);
  const [email, setEmail] = useState("");
  const [inviteToken, setInviteToken] = useState(null);
  useEffect(() => { api.get("/coach/clients").then(setClients).catch(() => setClients([])); }, []);

  async function invite(e) {
    e.preventDefault();
    const res = await api.post("/coach/invitations", { email });
    setInviteToken(res.token);
    setEmail("");
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="font-heading uppercase tracking-wide text-2xl">{t("coach.clients")}</h1>
      <form onSubmit={invite} className="flex flex-wrap gap-2 items-end">
        <label className="flex-1 min-w-[200px] space-y-1">
          <span className="font-heading uppercase text-sm">{t("coach.inviteEmail")}</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border-2 border-ink rounded-none" />
        </label>
        <Button type="submit" variant="primary">{t("coach.send")}</Button>
      </form>
      {inviteToken && (
        <p className="border-2 border-success p-3 text-sm break-all">
          {`${window.location.origin}/login?invite=${inviteToken}`}
        </p>
      )}
      {!clients ? <Spinner /> : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} to={`/coach/clients/${c.id}`} className="flex justify-between items-center border-2 border-border p-4 hover:border-primary">
              <div><div className="font-heading uppercase tracking-wide font-bold">{c.name}</div><div className="text-sm text-ink/60">{c.email}</div></div>
              <span className="font-heading text-primary">{c.totalEntries} {t("coach.totalEntries")}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
