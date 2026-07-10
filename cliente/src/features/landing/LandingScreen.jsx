import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Users, KeyRound } from "lucide-react";

export function LandingScreen() {
  const { t } = useTranslation();

  return (
    <div className="min-h-dvh bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-ink text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 h-16">
          <img src="/logo-full.webp" alt="Blaze Lifestyle" className="h-10 w-auto" />
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="font-heading uppercase tracking-wide text-sm px-4 min-h-[40px] flex items-center text-white/80 hover:text-white"
            >
              {t("landing.navLogin")}
            </Link>
            <Link
              to="/register"
              className="font-heading uppercase tracking-wide text-sm px-4 min-h-[40px] flex items-center bg-primary text-white border-2 border-primary"
            >
              {t("landing.navSignup")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24 flex flex-col items-center text-center gap-6">
          <img src="/logo-full.webp" alt="Blaze Lifestyle" className="h-28 lg:h-36 w-auto" />
          <h1 className="font-heading uppercase tracking-wide text-3xl lg:text-5xl font-bold max-w-3xl leading-tight">
            {t("landing.heroTitle")}
          </h1>
          <p className="text-white/70 text-base lg:text-lg max-w-xl">{t("landing.heroSubtitle")}</p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <Link
              to="/register"
              className="font-heading uppercase tracking-wide text-sm px-6 min-h-[52px] flex items-center justify-center bg-primary text-white border-2 border-primary"
            >
              {t("landing.heroCtaPrimary")}
            </Link>
            <Link
              to="/login"
              className="font-heading uppercase tracking-wide text-sm px-6 min-h-[52px] flex items-center justify-center bg-transparent text-white border-2 border-white/40 hover:border-white"
            >
              {t("landing.heroCtaSecondary")}
            </Link>
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="bg-black/[0.03] border-y-2 border-ink/10">
        <div className="max-w-6xl mx-auto px-4 py-16 lg:py-24">
          <h2 className="font-heading uppercase tracking-wide text-2xl lg:text-3xl font-bold text-center mb-10">
            {t("landing.rolesTitle")}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <div className="bg-white border-2 border-ink p-6">
              <Users className="w-7 h-7 text-primary mb-3" />
              <h3 className="font-heading uppercase tracking-wide text-lg font-bold mb-2">{t("landing.clientTitle")}</h3>
              <p className="text-ink/70 text-sm">{t("landing.clientDesc")}</p>
            </div>
            <div className="bg-white border-2 border-ink p-6">
              <KeyRound className="w-7 h-7 text-primary mb-3" />
              <h3 className="font-heading uppercase tracking-wide text-lg font-bold mb-2">{t("landing.coachTitle")}</h3>
              <p className="text-ink/70 text-sm">{t("landing.coachDesc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 lg:py-20 flex flex-col items-center text-center gap-5">
          <h2 className="font-heading uppercase tracking-wide text-2xl lg:text-4xl font-bold max-w-xl">
            {t("landing.ctaTitle")}
          </h2>
          <Link
            to="/register"
            className="font-heading uppercase tracking-wide text-sm px-8 min-h-[52px] flex items-center justify-center bg-primary text-white border-2 border-primary"
          >
            {t("landing.ctaButton")}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t-2 border-ink/10">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/logo-full.webp" alt="Blaze Lifestyle" className="h-8 w-auto" />
          <p className="text-ink/40 text-xs font-heading uppercase tracking-wide">{t("landing.footerTagline")}</p>
        </div>
      </footer>
    </div>
  );
}
