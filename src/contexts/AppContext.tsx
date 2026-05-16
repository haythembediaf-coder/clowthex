import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getSetting, setSetting } from "@/lib/db";
import { translations, type Lang, type Translation } from "@/i18n/translations";
import type { Currency } from "@/lib/db";

type Theme = "light" | "dark";

interface AppContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translation;
  theme: Theme;
  setTheme: (t: Theme) => void;
  currency: Currency;
  setCurrency: (c: Currency) => void;
  exchangeRate: number; // 1 EUR = ? DZD
  setExchangeRate: (r: number) => void;
  formatPrice: (dzd: number, currencyOverride?: Currency) => string;
  isReady: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const RTL_LANGS: Lang[] = ["ar"];

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ar");
  const [theme, setThemeState] = useState<Theme>("dark");
  const [currency, setCurrencyState] = useState<Currency>("DZD");
  const [exchangeRate, setExchangeRateState] = useState<number>(150);
  const [isReady, setIsReady] = useState(false);

  // Load settings
  useEffect(() => {
    (async () => {
      const [l, th, cu, ex] = await Promise.all([
        getSetting<Lang>("lang"),
        getSetting<Theme>("theme"),
        getSetting<Currency>("currency"),
        getSetting<number>("exchangeRate"),
      ]);
      if (l) setLangState(l);
      if (th) setThemeState(th);
      if (cu) setCurrencyState(cu);
      if (typeof ex === "number") setExchangeRateState(ex);
      setIsReady(true);
    })();
  }, []);

  // Apply lang/dir
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = RTL_LANGS.includes(lang) ? "rtl" : "ltr";
  }, [lang]);

  // Apply theme
  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else html.classList.remove("dark");
  }, [theme]);

  const setLang = (l: Lang) => {
    setLangState(l);
    setSetting("lang", l);
  };
  const setTheme = (t: Theme) => {
    setThemeState(t);
    setSetting("theme", t);
  };
  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    setSetting("currency", c);
  };
  const setExchangeRate = (r: number) => {
    setExchangeRateState(r);
    setSetting("exchangeRate", r);
  };

  const t = translations[lang] as Translation;

  const formatPrice = (dzd: number, currencyOverride?: Currency) => {
    const cur = currencyOverride ?? currency;
    if (cur === "EUR") {
      const v = dzd / (exchangeRate || 1);
      return new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : lang, {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 2,
      }).format(v);
    }
    const formatted = new Intl.NumberFormat(lang === "ar" ? "ar-DZ" : lang, {
      maximumFractionDigits: 0,
    }).format(dzd);
    return `${formatted} ${lang === "ar" ? "د.ج" : "DZD"}`;
  };

  return (
    <AppContext.Provider
      value={{
        lang,
        setLang,
        t,
        theme,
        setTheme,
        currency,
        setCurrency,
        exchangeRate,
        setExchangeRate,
        formatPrice,
        isReady,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}