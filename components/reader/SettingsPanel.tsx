"use client";

import type { ReaderSettings, Theme } from "@/lib/types";

const THEMES: Array<{ id: Theme; label: string; swatch: string; ink: string }> = [
  { id: "light", label: "Light", swatch: "#fffdf8", ink: "#2b2620" },
  { id: "sepia", label: "Sepia", swatch: "#f7edd9", ink: "#463726" },
  { id: "dark", label: "Dark", swatch: "#1c1915", ink: "#e6dcc8" },
];

export function SettingsPanel({
  settings,
  format,
  onChange,
  onClose,
}: {
  settings: ReaderSettings;
  format: "epub" | "pdf";
  onChange: (patch: Partial<ReaderSettings>) => void;
  onClose: () => void;
}) {
  return (
    <div className="pop-in absolute top-3 right-3 z-40 w-[280px] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_26px_60px_-30px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.18em] text-[var(--muted)] uppercase">Reading</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="rounded-full p-1 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <p className="mt-4 text-[11px] font-medium">Page colour</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            type="button"
            onClick={() => onChange({ theme: theme.id })}
            aria-pressed={settings.theme === theme.id}
            className={`rounded-lg border p-2 text-left transition ${
              settings.theme === theme.id
                ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                : "border-[var(--line)] hover:border-[var(--accent-soft)]"
            }`}
            style={{ background: theme.swatch, color: theme.ink }}
          >
            <span className="block text-[10px] tracking-[0.1em] uppercase">{theme.label}</span>
            <span className="mt-1 block font-serif text-sm">Aa</span>
          </button>
        ))}
      </div>

      {format === "epub" ? (
        <>
          <label className="mt-5 block text-[11px] font-medium">
            Text size
            <span className="float-right text-[var(--muted)]">{settings.fontSize}%</span>
            <input
              type="range"
              min={80}
              max={150}
              step={5}
              value={settings.fontSize}
              onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </label>

          <label className="mt-4 block text-[11px] font-medium">
            Line spacing
            <span className="float-right text-[var(--muted)]">{settings.lineHeight.toFixed(1)}</span>
            <input
              type="range"
              min={1.4}
              max={2.1}
              step={0.1}
              value={settings.lineHeight}
              onChange={(event) => onChange({ lineHeight: Number(event.target.value) })}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </label>

          <p className="mt-4 text-[11px] font-medium">Margins</p>
          <div className="mt-2 flex gap-2">
            {(["narrow", "normal", "wide"] as const).map((margin) => (
              <button
                key={margin}
                type="button"
                onClick={() => onChange({ margin })}
                aria-pressed={settings.margin === margin}
                className={`flex-1 rounded-md border px-2 py-1.5 text-[10px] tracking-[0.08em] uppercase transition ${
                  settings.margin === margin
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--line)] text-[var(--muted)] hover:border-[var(--accent-soft)]"
                }`}
              >
                {margin}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-5 text-[11px] leading-relaxed text-[var(--muted)]">
          PDF pages keep their printed layout; the colour option only dims the page for reading at
          night.
        </p>
      )}

      <div className="mt-5 border-t border-[var(--line)] pt-3">
        <label className="flex items-center justify-between text-[11px] font-medium">
          Translate to
          <select
            value={settings.targetLang}
            onChange={(event) => onChange({ targetLang: event.target.value })}
            className="rounded-md border border-[var(--line)] bg-transparent px-1.5 py-1 text-[11px]"
          >
            {[
              ["tr", "Türkçe"],
              ["en", "English"],
              ["de", "Deutsch"],
              ["fr", "Français"],
              ["es", "Español"],
              ["it", "Italiano"],
            ].map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[10px] leading-relaxed text-[var(--muted)]">
          Select any sentence on the page to translate it in place.
        </p>
      </div>
    </div>
  );
}
