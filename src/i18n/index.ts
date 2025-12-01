import en from "./en.json";
import es from "./es.json";
import de from "./de.json";
import fr from "./fr.json";
import it from "./it.json";
import pt from "./pt.json";

export const locales = ["en", "es", "de", "fr", "it", "pt"] as const;

export type Locale = (typeof locales)[number];

export const fallbackLocale: Locale = "en";

const dictionariesMap = {
  en,
  es,
  de,
  fr,
  it,
  pt,
} as const satisfies Record<Locale, typeof en>;

export type Messages = typeof en;

export function resolveLocale(input?: string): Locale {
  if (!input) {
    return fallbackLocale;
  }
  const normalized = input.toLowerCase();
  if (isLocale(normalized)) {
    return normalized;
  }
  const base = normalized.split("-")[0];
  if (isLocale(base)) {
    return base;
  }
  return fallbackLocale;
}

export function getMessages(locale?: string) {
  const resolved = resolveLocale(locale);
  return {
    locale: resolved,
    messages: dictionariesMap[resolved],
  };
}

function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const dictionaries = dictionariesMap;

const localeCurrencyMap: Record<Locale, string> = {
  en: "USD",
  es: "EUR",
  de: "EUR",
  fr: "EUR",
  it: "EUR",
  pt: "EUR",
};

export function getCurrencyForLocale(locale?: string): string {
  const resolved = resolveLocale(locale);
  return localeCurrencyMap[resolved] ?? localeCurrencyMap[fallbackLocale];
}
