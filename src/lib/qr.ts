// Stable public base URL used for QR links.
//
// The editor preview host (id-preview--*.lovable.app) is protected by a Lovable
// login, so a QR built from window.location.origin while previewing would send
// the scanner to a sign-in page. QR codes must therefore always point at the
// public published host, which serves /qr/:token without any login.
const PUBLIC_BASE_URL =
  (import.meta.env["VITE_PUBLIC_APP_URL"] as string | undefined)?.replace(/\/+$/, "") ||
  "https://project--785b75f9-2f8f-4b8b-a37f-308e34525b1b.lovable.app";

function isPublicHost(origin: string) {
  if (!origin.startsWith("https://")) return false; // localhost / http dev hosts
  const host = new URL(origin).hostname;
  if (host.includes("id-preview--")) return false; // editor preview (login required)
  if (host.endsWith("-dev.lovable.app")) return false; // preview build host
  if (host.endsWith(".lovableproject.com")) return false;
  return true;
}

/** Public base URL that anyone (signed out, any device) can open. */
export function publicBaseUrl() {
  if (typeof window !== "undefined" && isPublicHost(window.location.origin)) {
    return window.location.origin;
  }
  return PUBLIC_BASE_URL;
}

/** Public URL of the secret-answer page for one question's QR token. */
export function qrTarget(qrToken: string) {
  return `${publicBaseUrl()}/qr/${encodeURIComponent(qrToken)}`;
}

export function qrImageUrl(qrToken: string, size = 320) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(
    qrTarget(qrToken),
  )}`;
}
