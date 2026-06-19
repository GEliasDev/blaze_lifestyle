const base =
  "min-h-[44px] px-4 font-heading uppercase tracking-wide border-2 rounded-none transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed motion-reduce:active:scale-100";
const variants = {
  primary: "bg-primary text-white border-primary",
  secondary: "bg-white text-ink border-ink",
};

export function Button({ variant = "primary", className = "", ...rest }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />;
}
