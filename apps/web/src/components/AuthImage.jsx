import { useEffect, useState } from "react";
import { api } from "../lib/api.js";

export function AuthImage({ path, alt = "", className = "" }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let revoked = false;
    let made = null;
    api.blobUrl(path).then((u) => { if (!revoked) { made = u; setUrl(u); } }).catch(() => {});
    return () => { revoked = true; if (made) URL.revokeObjectURL(made); };
  }, [path]);
  if (!url) return <div className={`bg-muted ${className}`} aria-label={alt} />;
  return <img src={url} alt={alt} className={className} />;
}
