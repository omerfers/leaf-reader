export type BookFormat = "epub" | "pdf";
export type Theme = "light" | "sepia" | "dark";

export interface BookMeta {
  id: string;
  title: string;
  author?: string;
  format: BookFormat;
  cover?: string;
  pages?: number;
  addedAt: number;
  lastOpenedAt?: number;
}

export interface ReaderSettings {
  theme: Theme;
  fontSize: number;
  lineHeight: number;
  margin: "narrow" | "normal" | "wide";
  targetLang: string;
}

export type Progress =
  | { kind: "epub"; cfi: string; percent: number }
  | { kind: "pdf"; page: number; total: number };

export const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "light",
  fontSize: 100,
  lineHeight: 1.7,
  margin: "normal",
  targetLang: "tr",
};

export const TRANSLATE_LANGS = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" },
];
