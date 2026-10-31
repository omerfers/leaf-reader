"use client";

import type { SelectionInfo } from "./TranslatePopover";

const COLORS = [
  { name: "Yellow", value: "#f6d55c" },
  { name: "Green", value: "#a8d5a2" },
  { name: "Blue", value: "#a9c7e8" },
  { name: "Pink", value: "#f2b8c6" },
];

export function SelectionToolbar({
  selection,
  onHighlight,
  onUnderline,
  onTranslate,
  onDismiss,
}: {
  selection: SelectionInfo;
  onHighlight: (color: string) => void;
  onUnderline: (color: string) => void;
  onTranslate: () => void;
  onDismiss: () => void;
}) {
  const width = 300;
  const left = Math.min(
    Math.max(12, selection.rect.x + selection.rect.width / 2 - width / 2),
    Math.max(12, window.innerWidth - width - 12),
  );
  const top = Math.min(selection.rect.y + selection.rect.height + 8, window.innerHeight - 70);

  return (
    <div
      className="pop-in fixed z-50 flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.7)]"
      style={{ left, top }}
      role="toolbar"
      aria-label="Selection actions"
    >
      {COLORS.map((color) => (
        <button
          key={color.name}
          type="button"
          onClick={() => onHighlight(color.value)}
          aria-label={`Highlight ${color.name.toLowerCase()}`}
          className="h-6 w-6 rounded-full border border-black/10 transition hover:scale-110"
          style={{ backgroundColor: color.value }}
        />
      ))}

      <span className="mx-0.5 h-5 w-px bg-[var(--line)]" />

      <button
        type="button"
        onClick={() => onUnderline(COLORS[0].value)}
        aria-label="Underline"
        className="grid h-6 w-6 place-items-center rounded-full text-[var(--ink)] transition hover:bg-black/5"
      >
        <span className="text-[13px] font-semibold underline decoration-2 underline-offset-2">U</span>
      </button>

      <button
        type="button"
        onClick={onTranslate}
        className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-[var(--accent)] uppercase transition hover:bg-[var(--accent)]/10"
      >
        Translate
      </button>

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="grid h-6 w-6 place-items-center rounded-full text-[var(--muted)] transition hover:bg-black/5"
      >
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
