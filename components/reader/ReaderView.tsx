"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getBook, getFile, getProgress, getSettings, saveProgress, saveSettings, updateBook } from "@/lib/db";
import { DEFAULT_SETTINGS, type BookMeta, type Progress, type ReaderSettings } from "@/lib/types";
import { percentLabel } from "@/lib/format";
import { EpubReader } from "./EpubReader";
import { PdfReader } from "./PdfReader";
import { SettingsPanel } from "./SettingsPanel";
import { TranslatePopover, type SelectionInfo } from "./TranslatePopover";

export function ReaderView({ id }: { id: string }) {
  const [book, setBook] = useState<BookMeta | null>(null);
  const [file, setFile] = useState<Blob | null>(null);
  const [progress, setProgress] = useState<Progress | undefined>(undefined);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selection, setSelection] = useState<SelectionInfo | null>(null);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const meta = await getBook(id);
      if (!meta) {
        if (!cancelled) setError("This book is not on your shelf any more.");
        return;
      }
      const [blob, stored, storedSettings] = await Promise.all([
        getFile(id),
        getProgress(id),
        getSettings(),
      ]);
      if (cancelled) return;
      if (!blob) {
        setError("The book file is missing.");
        return;
      }
      const active = storedSettings ?? {
        ...DEFAULT_SETTINGS,
        theme: (document.documentElement.dataset.theme as ReaderSettings["theme"]) ?? "light",
      };
      setBook(meta);
      setFile(blob);
      setProgress(stored);
      setSettings(active);
      setReady(true);
      void updateBook(id, { lastOpenedAt: Date.now() });
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const applySettings = useCallback((patch: Partial<ReaderSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      document.documentElement.dataset.theme = next.theme;
      try {
        localStorage.setItem("leaf.theme", next.theme);
      } catch {}
      void saveSettings(next);
      return next;
    });
  }, []);

  const handleProgress = useCallback(
    (next: Progress) => {
      setProgress(next);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        void saveProgress(id, next);
      }, 600);
    },
    [id],
  );

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleEpubProgress = useCallback(
    (cfi: string, percent: number) => handleProgress({ kind: "epub", cfi, percent }),
    [handleProgress],
  );

  const handlePdfProgress = useCallback(
    (page: number, total: number) => handleProgress({ kind: "pdf", page, total }),
    [handleProgress],
  );

  if (error) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-6 text-center">
        <div>
          <p className="font-serif text-2xl">{error}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-[var(--accent)] underline">
            Back to the shelf
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--bg)] text-[var(--ink)]">
      <header className="z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--surface)]/85 px-3 backdrop-blur-md sm:px-5">
        <Link
          href="/"
          aria-label="Back to the shelf"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M15 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-tight">{book?.title ?? "Opening…"}</p>
          <p className="truncate text-[11px] leading-tight text-[var(--muted)]">
            {book?.author ?? (book ? book.format.toUpperCase() : "")}
            {progress ? ` · ${percentLabel(progress)}` : ""}
          </p>
        </div>

        <label className="hidden items-center gap-1.5 rounded-full border border-[var(--line)] px-2 py-1 text-[11px] text-[var(--muted)] sm:flex">
          <span className="tracking-[0.12em] uppercase">Translate</span>
          <select
            value={settings.targetLang}
            onChange={(event) => applySettings({ targetLang: event.target.value })}
            className="bg-transparent text-[11px] text-[var(--ink)] outline-none"
            aria-label="Translation language"
          >
            {TRANSLATE_LANGS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1">
          <IconButton
            label="Reading settings"
            onClick={() => setSettingsOpen((open) => !open)}
            active={settingsOpen}
          >
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" strokeLinecap="round" />
              <circle cx="16" cy="6" r="2" />
              <circle cx="10" cy="12" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
          </IconButton>
        </div>
      </header>

      <main className="relative min-h-0 flex-1">
        <div className="mx-auto h-full w-full max-w-4xl px-1 py-1 sm:px-4 sm:py-3">
          {ready && file && book ? (
            book.format === "epub" ? (
              <EpubReader
                file={file}
                initialCfi={progress?.kind === "epub" ? progress.cfi : undefined}
                settings={settings}
                onProgress={handleEpubProgress}
                onSelect={setSelection}
                onClearSelection={clearSelection}
              />
            ) : (
              <PdfReader
                file={file}
                initialPage={progress?.kind === "pdf" ? progress.page : 1}
                settings={settings}
                onProgress={handlePdfProgress}
                onSelect={setSelection}
                onClearSelection={clearSelection}
              />
            )
          ) : (
            <div className="grid h-full place-items-center">
              <p className="animate-pulse text-sm text-[var(--muted)]">Opening the book…</p>
            </div>
          )}
        </div>

        {settingsOpen && (
          <SettingsPanel
            settings={settings}
            format={book?.format ?? "epub"}
            onChange={applySettings}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </main>

      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-[var(--line)] bg-[var(--surface)]/70 px-4 text-[10px] tracking-[0.16em] text-[var(--muted)] uppercase">
        <span>{percentLabel(progress) ?? "0%"}</span>
        <span className="relative h-[2px] flex-1 overflow-hidden rounded-full bg-[var(--line)]">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${(progress ? progressFraction(progress) : 0) * 100}%` }}
          />
        </span>
        <span className="hidden sm:inline">{book?.format.toUpperCase()}</span>
      </footer>

      {selection && (
        <TranslatePopover
          key={`${selection.text.slice(0, 24)}-${settings.targetLang}`}
          selection={selection}
          targetLang={settings.targetLang}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-9 w-9 place-items-center rounded-full transition ${
        active
          ? "bg-[var(--accent)] text-white"
          : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
      }`}
    >
      {children}
    </button>
  );
}

function progressFraction(progress?: Progress) {
  if (!progress) return 0;
  return progress.kind === "epub"
    ? Math.min(1, Math.max(0, progress.percent))
    : Math.min(1, Math.max(0, progress.page / Math.max(1, progress.total)));
}

const TRANSLATE_LANGS = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "ar", label: "العربية" },
  { code: "ru", label: "Русский" },
];
