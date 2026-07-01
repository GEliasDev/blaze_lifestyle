import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { AuthImage } from "./AuthImage.jsx";

const HIDE_SCROLLBAR = "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

// Horizontal scroll-snap slider with paging dots. `large` switches to a
// contain-fit full-height image for the expanded (lightbox) view.
function Slider({ photos, startIndex = 0, large = false, onItemClick }) {
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
            <AuthImage path={`/photos/${p.storageKey}`} className={large ? "w-full h-[78vh] object-contain" : "w-full h-56 object-cover"} />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {photos.map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full transition-colors ${i === index ? "bg-primary" : "bg-white/70 border border-ink/20"}`} />
          ))}
        </div>
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
      <Slider photos={photos} onItemClick={(i) => setLightbox(i)} />
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
