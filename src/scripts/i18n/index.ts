// i18n central module — lightweight runtime translator with localStorage persistence.
// Locales: en, es, pt, fr, ja, ko, ru, it, de, zh
// API:
//   import i18n from './i18n';
//   i18n.setLocale('es');           // changes locale + persists + emits change
//   i18n.t('app_name');              // string lookup with fallback to 'en' then key
//   i18n.t('help_s1_q1');            // returns the localized string
//   i18n.t('key', { ...vars });      // simple {var} interpolation
//   i18n.getLocale();                // current locale
//   i18n.getAvailableLocales();      // array of codes
//   i18n.getDisplayName('fr');       // native name of a locale
//   i18n.fmtDate(date);              // locale-aware date format
//   i18n.fmtNumber(n, fraction);     // locale-aware number format
//   i18n.addEventListener('change', fn)  // listen for locale changes
//   i18n.translateElement(rootEl)    // walk the DOM and replace text/attrs marked with data-i18n

import en from './en';
import es from './es';
import pt from './pt';
import fr from './fr';
import ja from './ja';
import ko from './ko';
import ru from './ru';
import it from './it';
import de from './de';
import zh from './zh';

export type Locale =
  | 'en' | 'es' | 'pt' | 'fr' | 'ja' | 'ko' | 'ru'
  | 'it' | 'de' | 'zh';

export type LocaleWithSystem = Locale | 'system';

export const LOCALES: Locale[] = [
  'en', 'es', 'pt', 'fr', 'ja', 'ko', 'ru',
  'it', 'de', 'zh',
];

export const LOCALES_WITH_SYSTEM: LocaleWithSystem[] = [
  'system', 'en', 'es', 'pt', 'fr', 'ja', 'ko', 'ru',
  'it', 'de', 'zh',
];

export const LOCALE_DISPLAY_NAMES: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  it: 'Italiano',
  de: 'Deutsch',
  zh: '简体中文',
};

export const LOCALE_DISPLAY_NAMES_WITH_SYSTEM: Record<LocaleWithSystem, string> = {
  system: 'Sistema',
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  ja: '日本語',
  ko: '한국어',
  ru: 'Русский',
  it: 'Italiano',
  de: 'Deutsch',
  zh: '简体中文',
};

const translations: Record<Locale, Record<string, string>> = {
  en,
  es,
  pt,
  fr,
  ja,
  ko,
  ru,
  it,
  de,
  zh,
};

const STORAGE_KEY = 'app_lang_setting';

// Detect browser language on first run
function detectBrowserLocale(): Locale {
  const browserLang = (navigator.language || 'en').toLowerCase();
  for (const loc of LOCALES) {
    if (browserLang === loc || browserLang.startsWith(loc + '-')) {
      return loc;
    }
  }
  return 'es';
}

function resolveLocale(locale: LocaleWithSystem): Locale {
  if (locale === 'system') {
    return detectBrowserLocale();
  }
  return locale;
}

class I18n {
  private currentLocale: LocaleWithSystem;
  private listeners: Set<(locale: LocaleWithSystem) => void> = new Set();

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY) as LocaleWithSystem | null;
    if (saved && LOCALES_WITH_SYSTEM.includes(saved)) {
      this.currentLocale = saved;
    } else {
      this.currentLocale = 'system'; // Default to system
    }
  }

  getLocale(): LocaleWithSystem {
    return this.currentLocale;
  }

  getResolvedLocale(): Locale {
    return resolveLocale(this.currentLocale);
  }

  getAvailableLocales(): Locale[] {
    return [...LOCALES];
  }

  getAvailableLocalesWithSystem(): LocaleWithSystem[] {
    return [...LOCALES_WITH_SYSTEM];
  }

  getDisplayName(locale: LocaleWithSystem): string {
    return LOCALE_DISPLAY_NAMES_WITH_SYSTEM[locale] ?? locale;
  }

  setLocale(locale: LocaleWithSystem): void {
    if (!LOCALES_WITH_SYSTEM.includes(locale)) return;
    if (locale === this.currentLocale) return;
    this.currentLocale = locale;
    localStorage.setItem(STORAGE_KEY, locale);
    this.emit(locale);
  }

  addEventListener(event: 'change', fn: (locale: LocaleWithSystem) => void): void {
    if (event === 'change') this.listeners.add(fn);
  }

  removeEventListener(event: 'change', fn: (locale: LocaleWithSystem) => void): void {
    if (event === 'change') this.listeners.delete(fn);
  }

  private emit(locale: LocaleWithSystem): void {
    this.listeners.forEach(fn => {
      try { fn(locale); } catch (e) { console.error('i18n listener error', e); }
    });
  }

  /**
   * Look up a key. Falls back to English, then to the key itself if missing.
   * Supports {var} interpolation: t('greeting', { name: 'Ana' })
   */
  t(key: string, vars?: Record<string, string | number>): string {
    const resolvedLocale = this.getResolvedLocale();
    const dict = translations[resolvedLocale] || translations.en;
    let str = dict[key];
    if (str == null) {
      str = translations.en[key];
    }
    if (str == null) {
      return key;
    }
    if (vars) {
      str = str.replace(/\{(\w+)\}/g, (_, name) =>
        vars[name] != null ? String(vars[name]) : `{${name}}`
      );
    }
    return str;
  }

  fmtDate(date: Date | number | string): string {
    const d = date instanceof Date ? date : new Date(date);
    try {
      return new Intl.DateTimeFormat(this.getResolvedLocale(), {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d);
    } catch {
      return d.toDateString();
    }
  }

  fmtNumber(n: number, fractionDigits = 0): string {
    try {
      return new Intl.NumberFormat(this.getResolvedLocale(), {
        maximumFractionDigits: fractionDigits,
        minimumFractionDigits: fractionDigits,
      }).format(n);
    } catch {
      return n.toString();
    }
  }

  /**
   * Walk a DOM subtree and translate any element with data-i18n="key".
   * - data-i18n="key"          → textContent
   * - data-i18n-attr="key"     → applies to a single attribute (use data-i18n-attr="title|placeholder|aria-label")
   * - data-i18n-html="key"     → innerHTML (for sections containing <strong> etc.)
   * Multiple attributes can be supplied with data-i18n-attr-1, -2... (rare).
   * If `root` is omitted, document is used.
   */
  translateElement(root?: ParentNode | HTMLElement | Document): void {
    const scope = (root || document) as ParentNode;
    scope.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = this.t(key);
    });
    scope.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key) el.innerHTML = this.t(key);
    });
    scope.querySelectorAll<HTMLElement>('[data-i18n-attr]').forEach(el => {
      const key = el.getAttribute('data-i18n-attr-key') || el.getAttribute('data-i18n-attr')?.split('|')[0];
      const attr = el.getAttribute('data-i18n-attr')?.split('|')[1] || el.getAttribute('data-i18n-attr-name');
      if (key && attr) el.setAttribute(attr, this.t(key));
    });
    // Generic pattern: data-i18n-title, data-i18n-placeholder, data-i18n-aria
    ['title', 'placeholder', 'aria-label'].forEach(attrName => {
      const dataAttr = `data-i18n-${attrName}`;
      scope.querySelectorAll<HTMLElement>(`[${dataAttr}]`).forEach(el => {
        const key = el.getAttribute(dataAttr);
        if (key) el.setAttribute(attrName, this.t(key));
      });
    });
  }
}

const i18n = new I18n();
export default i18n;
export { I18n };
