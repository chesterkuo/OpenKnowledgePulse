/**
 * Auto-redirect first-time visitors to their browser locale.
 * Only triggers once — stores choice in localStorage so manual
 * locale switches via the dropdown are respected afterwards.
 */

const LOCALE_MAP: Record<string, string> = {
  "zh-Hans": "/zh-Hans/",
  zh: "/zh-Hans/",
  "zh-CN": "/zh-Hans/",
  "zh-SG": "/zh-Hans/",
  ja: "/ja/",
  ko: "/ko/",
  es: "/es/",
};

const STORAGE_KEY = "kp_locale_redirected";
const LOCALE_PREFIXES = ["/zh-Hans/", "/ja/", "/ko/", "/es/"];

function getLocaleRedirect(): string | null {
  // Only run in browser
  if (typeof window === "undefined") return null;

  // Already redirected once — respect user's current choice
  if (localStorage.getItem(STORAGE_KEY)) return null;

  // Only redirect from the default (English) locale pages
  const path = window.location.pathname;
  if (LOCALE_PREFIXES.some((prefix) => path.startsWith(prefix))) return null;

  // Find best match from browser languages
  for (const lang of navigator.languages ?? [navigator.language]) {
    // Exact match first (e.g. zh-Hans, zh-CN)
    if (LOCALE_MAP[lang]) return LOCALE_MAP[lang];
    // Base language match (e.g. "es-MX" → "es", "ja-JP" → "ja")
    const base = lang.split("-")[0];
    if (base !== "en" && LOCALE_MAP[base]) return LOCALE_MAP[base];
  }

  return null;
}

export function onRouteDidUpdate() {
  const redirect = getLocaleRedirect();
  if (redirect) {
    localStorage.setItem(STORAGE_KEY, "1");
    // Preserve the path under the locale prefix
    // e.g. /docs/foo → /ja/docs/foo
    const path = window.location.pathname;
    window.location.replace(redirect + path.replace(/^\//, ""));
  }
}
