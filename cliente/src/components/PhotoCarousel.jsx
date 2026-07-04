import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { AuthImage } from "./AuthImage.jsx";

const HIDE_SCROLLBAR = "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Horizontal scroll-snap slider with paging dots + prev/next arrows (dragging
// only works with touch/trackpad, so desktop mouse users need the arrows).
// `large` switches to a contain-fit full-height image for the lightbox view.
function Slider({ photos, startIndex = 0, large = false, onItemClick }) {
  const { t } = useTranslation();
  const ref = useRef(null);
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollLeft = startIndex * el.clientWidth;
  }, [startIndex]);

  function onScroll() {
    const el = ref.current;
    if (el) setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ left: Math.max(0, Math.min(photos.length - 1, i)) * el.clientWidth, behavior: "smooth" });
  }

  useEffect(() => {
    if (!large || photos.length < 2) return;
    function onKey(e) {
      if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="relative w-full">
      <div ref={ref} onScroll={onScroll} className={`flex overflow-x-auto snap-x snap-mandatory ${HIDE_SCROLLBAR}`}>
        {photos.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onItemClick?.(i)}
            className={`snap-center shrink-0 w-full ${onItemClick ? "cursor-zoom-in" : "cursor-default"}`}
          >
            <AuthImage path={`/photos/${p.storageKey}`} className={large ? "w-full h-[78vh] object-contain" : "w-full aspect-[4/5] object-contain bg-muted"} />
          </button>
        ))}
      </div>

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            aria-label={t("entry.prevPhoto")}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === photos.length - 1}
            aria-label={t("entry.nextPhoto")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {photos.map((_, i) => (
              <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-white/70 border border-ink/20"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function PhotoCarousel({ photos }) {
  const [lightbox, setLightbox] = useState(null); // tapped index, or null

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => e.key === "Escape" && setLightbox(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  if (!photos?.length) return null;

  return (
    <>
      <div className="mx-auto w-full max-w-md lg:max-w-lg border-b-2 border-border">
        <Slider photos={photos} onItemClick={(i) => setLightbox(i)} />
      </div>
      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="flex justify-end p-3">
            <button onClick={() => setLightbox(null)} aria-label="close" className="text-white min-h-[44px] min-w-[44px] flex items-center justify-center">
              <X className="w-7 h-7" />
            </button>
          </div>
          <div className="flex-1 flex items-center">
            <Slider photos={photos} startIndex={lightbox} large />
          </div>
        </div>
      )}
    </>
  );
}
