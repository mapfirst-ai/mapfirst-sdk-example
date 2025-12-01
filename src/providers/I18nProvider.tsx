"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  dictionaries,
  fallbackLocale,
  Locale,
  Messages,
  resolveLocale,
} from "@/i18n";

type Primitive = string | number | boolean;

export type TranslationParams = Record<string, Primitive>;

type I18nContextValue = {
  locale: Locale;
  t: (key: string, params?: TranslationParams) => string;
  formatDate: (
    value: Date | number | string | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (
    value: number,
    currency?: string,
    options?: Intl.NumberFormatOptions
  ) => string;
  setLocale: (locale: string) => void;
};

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

type TranslationHelpers = Omit<I18nContextValue, "setLocale">;

export function I18nProvider({
  lang,
  children,
}: {
  lang?: string;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => resolveLocale(lang));

  useEffect(() => {
    setLocaleState(resolveLocale(lang));
  }, [lang]);

  const changeLocale = useCallback((nextLocale: string) => {
    setLocaleState(resolveLocale(nextLocale));
  }, []);

  const translator = useMemo<TranslationHelpers>(
    () =>
      createTranslator(
        locale,
        dictionaries[locale],
        dictionaries[fallbackLocale]
      ),
    [locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      ...translator,
      setLocale: changeLocale,
    }),
    [translator, changeLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);

  const fallbackContext = useMemo<I18nContextValue>(() => {
    const helpers = createTranslator(
      fallbackLocale,
      dictionaries[fallbackLocale],
      dictionaries[fallbackLocale]
    );
    return {
      ...helpers,
      setLocale: () => {
        /* noop */
      },
    };
  }, []);

  if (context) {
    return context;
  }

  return fallbackContext;
}

function createTranslator(
  locale: Locale,
  messages: Messages,
  fallbackMessages: Messages
): TranslationHelpers {
  const translate = (key: string, params?: TranslationParams) =>
    translateInternal(messages, fallbackMessages, key, params);
  const formatDate = (
    value: Date | number | string | null | undefined,
    options?: Intl.DateTimeFormatOptions
  ) => {
    if (value === null || value === undefined) {
      return "";
    }
    const date =
      value instanceof Date
        ? value
        : new Date(typeof value === "string" ? value : Number(value));
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    return new Intl.DateTimeFormat(locale, options).format(date);
  };

  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    new Intl.NumberFormat(locale, options).format(value);

  const formatCurrency = (
    value: number,
    currency = "USD",
    options?: Intl.NumberFormatOptions
  ) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      ...options,
    }).format(value);

  return {
    locale,
    t: translate,
    formatDate,
    formatNumber,
    formatCurrency,
  };
}

function translateInternal(
  messages: Messages,
  fallbackMessages: Messages,
  key: string,
  params?: TranslationParams
): string {
  const value =
    resolveValue(getNested(messages, key), params) ??
    resolveValue(getNested(fallbackMessages, key), params);

  if (value !== undefined) {
    return value;
  }

  return key;
}

function resolveValue(
  value: unknown,
  params?: TranslationParams
): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return interpolate(value, params);
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (params && typeof params.count === "number") {
      const count = Number(params.count);
      const pluralForm = selectPluralForm(count);
      const pluralCandidate = record[pluralForm] ?? record.other ?? record.one;
      if (typeof pluralCandidate === "string") {
        return interpolate(pluralCandidate, params);
      }
    }

    if (typeof record.default === "string") {
      return interpolate(record.default, params);
    }
  }

  return undefined;
}

function getNested(source: Messages, key: string): unknown {
  const segments = key.split(".");
  let current: unknown = source;

  for (const segment of segments) {
    if (
      current &&
      typeof current === "object" &&
      segment in (current as Record<string, unknown>)
    ) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }

  return current;
}

function interpolate(template: string, params?: TranslationParams): string {
  if (!params) {
    return template;
  }

  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token) => {
    if (!(token in params)) {
      return "";
    }
    const value = params[token];
    return String(value);
  });
}

function selectPluralForm(count: number): "one" | "other" {
  return count === 1 ? "one" : "other";
}
