import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

// Photos are served through an authenticated proxy, so a plain <img src> can't
// load them. We fetch the blob with the auth header and render an object URL.
export function AuthImage({ path, alt = "", className }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    let active = true;
    api.blobUrl(path).then((u) => { url = u; if (active) setSrc(u); }).catch(() => {});
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  return src
    ? <img src={src} alt={alt} className={className} />
    : <div className={`${className} bg-muted`} aria-hidden="true" />;
}
