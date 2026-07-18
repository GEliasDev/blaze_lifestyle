import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Clock, Pencil } from "lucide-react";
import { api } from "../../lib/api.js";
import { AppHeader } from "../../components/AppHeader.jsx";
import { Spinner } from "../../components/Spinner.jsx";
import { Button } from "../../components/Button.jsx";
import { useAuth } from "../../lib/auth.jsx";
import { COACH_NAV_ITEMS } from "./coachNav.js";

export function ClientsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [clients, setClients] = useState(null);
  const [error, setError] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [editingClient, setEditingClient] = useState(null); // client being renamed, or null
  const [nicknameInput, setNicknameInput] = useState("");
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  function load() {
    setError(false);
    setClients(null);
    api.get("/coach/clients").then(setClients).catch(() => setError(true));
  }
  useEffect(() => { load(); }, []);

  async function setStatus(clientId, status) {
    setSavingId(clientId);
    try { await api.patch(`/coach/clients/${clientId}/status`, { status }); load(); }
    finally { setSavingId(null); }
  }

  function openEditNickname(client) {
    setEditingClient(client);
    setNicknameInput(client.nickname ?? "");
  }

  // navigator.clipboard.writeText requires a secure context (HTTPS or
  // localhost) — on a LAN dev URL like http://192.168.1.25:5173 it rejects,
  // which (unguarded) aborted this function before the confirmation ever
  // showed. Falls back to the older execCommand approach, which still works
  // over plain HTTP, so the button behaves the same in dev and in prod.
  async function copyCoachCode() {
    const text = user.coachCode;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Clipboard genuinely unavailable — nothing else to fall back to.
    }
  }

  async function onSaveNickname() {
    setNicknameSaving(true);
    try {
      await api.patch(`/coach/clients/${editingClient.id}/nickname`, { nickname: nicknameInput.trim() });
      setEditingClient(null);
      load();
    } finally { setNicknameSaving(false); }
  }

  return (
    <>
      <AppHeader title={t("coach.clients").toUpperCase()} navItems={COACH_NAV_ITEMS} settingsTo="/coach/settings" />
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
      {user?.coachCode && (
        <div className="flex items-center justify-between border-2 border-primary p-3">
          <div>
            <div className="font-heading uppercase text-xs text-ink/60">{t("coach.yourCode")}</div>
            <div className="font-heading text-2xl tracking-[0.3em] text-primary">{user.coachCode}</div>
          </div>
          {codeCopied ? (
            <span className="flex items-center gap-1 text-success font-heading uppercase text-sm">
              <Check className="w-4 h-4" />{t("coach.codeCopied")}
            </span>
          ) : (
            <button onClick={copyCoachCode} className="border-2 border-ink min-h-[44px] px-3 font-heading uppercase text-sm">{t("coach.copy")}</button>
          )}
        </div>
      )}
      {error ? (
        <div className="border-2 border-border p-4 space-y-3 text-center">
          <p className="text-ink/60 text-sm">{t("common.error")}</p>
          <Button variant="secondary" onClick={load}>{t("common.retry")}</Button>
        </div>
      ) : !clients ? <Spinner /> : clients.length === 0 ? (
        <p className="text-ink/50 text-sm">{t("coach.noClients")}</p>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => {
            const pending = c.status === "pending";
            const saving = savingId === c.id;
            return (
              <div key={c.id} className="border-2 border-border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Link to={`/coach/clients/${c.id}`} className="flex-1 min-w-0 flex items-center justify-between gap-3 hover:text-primary">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-heading uppercase tracking-wide font-bold truncate">{c.nickname || c.name}</span>
                        {c.isSelf && (
                          <span className="shrink-0 text-xs font-heading uppercase tracking-wide text-primary border border-primary px-1.5 py-0.5">{t("coach.you")}</span>
                        )}
                      </div>
                      {c.nickname && <div className="text-xs text-ink/50 truncate">{c.name}</div>}
                      <div className="text-sm text-ink/60 truncate">{c.email}</div>
                    </div>
                    {pending && <Clock className="w-5 h-5 text-primary shrink-0" aria-label={t("coach.pendingVerification")} />}
                  </Link>
                  <button onClick={() => openEditNickname(c)} aria-label={t("coach.editNickname")} className="text-ink/60 p-2 shrink-0">
                    <Pencil className="w-5 h-5" />
                  </button>
                </div>
                {pending && (
                  <div className="flex gap-2">
                    <Button variant="primary" className="flex-1" disabled={saving} onClick={() => setStatus(c.id, "approved")}>{t("coach.accept")}</Button>
                    <Button variant="secondary" className="flex-1" disabled={saving} onClick={() => setStatus(c.id, "rejected")}>{t("coach.reject")}</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      </div>

      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label={t("common.cancel")} onClick={() => setEditingClient(null)} className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white border-2 border-ink w-full max-w-sm p-4 space-y-4">
            <h2 className="font-heading uppercase tracking-wide text-sm">{t("coach.editNickname")}</h2>
            <p className="text-ink/60 text-sm">{editingClient.name}</p>
            <input
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder={t("coach.nicknamePlaceholder")}
              className="w-full p-3 border-2 border-border rounded-none"
            />
            <div className="flex gap-3">
              <Button variant="primary" className="flex-1" disabled={nicknameSaving} onClick={onSaveNickname}>{t("common.save")}</Button>
              <Button variant="secondary" className="flex-1" disabled={nicknameSaving} onClick={() => setEditingClient(null)}>{t("common.cancel")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
