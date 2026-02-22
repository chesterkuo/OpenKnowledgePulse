import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zhHans from "./locales/zh-Hans.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import es from "./locales/es.json";

const SUPPORTED_LOCALES = ["en", "zh-Hans", "ja", "ko", "es"];

// Map browser language codes (BCP-47) to our locale keys
function mapBrowserLanguage(lng: string): string {
  // zh-CN, zh-SG, zh → zh-Hans (Simplified Chinese)
  if (/^zh\b/i.test(lng) && !/^zh-(TW|HK|Hant)/i.test(lng)) return "zh-Hans";
  // zh-TW, zh-HK, zh-Hant → not supported, fall through to base match
  if (/^zh\b/i.test(lng)) return "zh-Hans";
  // es-MX, es-AR etc → es
  const base = lng.split("-")[0].toLowerCase();
  if (SUPPORTED_LOCALES.includes(base)) return base;
  return lng;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      "zh-Hans": { translation: zhHans },
      ja: { translation: ja },
      ko: { translation: ko },
      es: { translation: es },
    },
    supportedLngs: SUPPORTED_LOCALES,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "kp_language",
      convertDetectedLanguage: mapBrowserLanguage,
    },
  });

export default i18n;
