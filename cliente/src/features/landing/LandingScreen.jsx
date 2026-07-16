import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function LandingScreen() {
  const { t } = useTranslation();

  return (
    <div className="h-dvh flex flex-col bg-ink">
      {/* Nav */}
      <header className="shrink-0 bg-ink text-white">
        <div className="max-w-6xl mx-auto flex items-center justify-end px-4 h-16 lg:h-20">
          <nav className="flex items-center gap-2">
            <Link
              to="/login"
              className="font-heading uppercase tracking-wide text-sm lg:text-base px-4 min-h-[40px] lg:min-h-[48px] flex items-center text-white/80 hover:text-white"
            >
              {t("landing.navLogin")}
            </Link>
            <Link
              to="/register"
              className="font-heading uppercase tracking-wide text-sm lg:text-base px-4 lg:px-6 min-h-[40px] lg:min-h-[48px] flex items-center bg-primary text-white border-2 border-primary"
            >
              {t("landing.navSignup")}
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — fills all remaining height below the nav, on mobile and desktop alike. */}
      <section className="flex-1 min-h-0 bg-ink text-white flex items-center overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 py-10 w-full flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20">
          <img src="/logo-full.webp" alt="Blaze Lifestyle" className="h-40 sm:h-48 lg:h-72 w-auto shrink-0" />
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left gap-8 lg:gap-10">
            <h1 className="font-heading uppercase tracking-wide font-bold leading-tight">
              <span className="block text-3xl sm:text-4xl lg:text-6xl">{t("landing.heroTitleLine1")}</span>
              <span className="block mt-4 lg:mt-6 space-y-1 lg:space-y-2 text-primary">
                <span className="block text-xl sm:text-2xl lg:text-4xl">{t("landing.heroPillarNutrition")}</span>
                <span className="block text-xl sm:text-2xl lg:text-4xl">{t("landing.heroPillarExercise")}</span>
                <span className="block text-xl sm:text-2xl lg:text-4xl">{t("landing.heroPillarMindset")}</span>
              </span>
            </h1>
          </div>
        </div>
      </section>
    </div>
  );
}
