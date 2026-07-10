import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// Brutalist back affordance: bordered pill that inverts on hover and gives
// the same press feedback as Button.jsx, instead of a bare text link.
export function BackLink({ to, children }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1.5 h-9 pl-2 pr-3 w-fit border-2 border-ink rounded-none font-heading uppercase tracking-wide text-xs text-ink transition-all hover:bg-ink hover:text-white active:scale-95 motion-reduce:active:scale-100"
    >
      <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
      {children}
    </Link>
  );
}
