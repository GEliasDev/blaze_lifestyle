import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export function AppHeader({ title, showBack = false }) {
  const navigate = useNavigate();
  return (
    <header className="bg-ink text-white">
      <div className="flex items-center gap-3 p-4">
        {showBack && (
          <button onClick={() => navigate(-1)} aria-label="back" className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div>
          <div className="font-heading font-bold tracking-wide text-lg">BLAZE LIFESTYLE</div>
          <div className="text-white/60 text-xs tracking-wide">{title ?? "NUTRITION TRACKER"}</div>
        </div>
      </div>
    </header>
  );
}
