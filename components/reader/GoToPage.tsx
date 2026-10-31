"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * "Go to page" lives in a small dialog rather than in the header. A phone
 * keyboard for numbers has no Return key on iOS, so the dialog carries its own
 * Go button, and the field is large enough to tap comfortably.
 */
export function GoToPage({
  page,
  total,
  onJump,
}: {
  page?: number;
  total: number;
  onJump: (page: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = page ?? 1;
  const max = Math.max(1, total);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(String(page ?? 1));
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setError(null);
    window.setTimeout(() => triggerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "Tab" && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>("input, button, [tabindex]:not([tabindex='-1'])"),
        ).filter((el) => !el.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  const openDialog = () => {
    setDraft(String(page ?? 1));
    setError(null);
    setOpen(true);
  };

  const submit = () => {
    const parsed = Number(draft.trim());
    if (!draft.trim() || !Number.isInteger(parsed) || parsed < 1) {
      setError("Enter a page number.");
      return;
    }
    if (total && parsed > total) {
      setError(`This book has ${total} pages.`);
      return;
    }
    onJump(parsed);
    close();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        disabled={total === 0}
        aria-haspopup="dialog"
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] px-3 text-[12px] text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] disabled:opacity-60 sm:h-9"
      >
        <span className="sr-only">Go to page,</span>
        {/* picture-only pages (covers, plates) have no page number */}
        <span className="text-[var(--ink)] tabular-nums">{page ?? "–"}</span>
        <span className="tabular-nums">/ {total || "…"}</span>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-6" onMouseDown={(event) => {
          if (event.target === event.currentTarget) close();
        }}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="pop-in w-full rounded-t-2xl border border-[var(--line)] bg-[var(--surface)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-20px_60px_-30px_rgba(0,0,0,0.6)] sm:max-w-sm sm:rounded-2xl sm:pb-5"
          >
            <div className="flex items-center justify-between">
              <h2 id={titleId} className="text-[11px] tracking-[0.18em] text-[var(--muted)] uppercase">
                Go to page
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="grid h-11 w-11 place-items-center rounded-full text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)] sm:h-8 sm:w-8"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form
              className="mt-3 flex items-center gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <label className="sr-only" htmlFor={`${titleId}-input`}>
                Page number, 1 to {max}
              </label>
              <input
                id={`${titleId}-input`}
                autoFocus
                type="text"
                inputMode="numeric"
                enterKeyHint="go"
                autoComplete="off"
                value={draft}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => {
                  setDraft(event.target.value.replace(/[^0-9]/g, ""));
                  setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${titleId}-error` : undefined}
                className="h-12 w-28 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] text-center text-[18px] text-[var(--ink)] tabular-nums outline-none focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/40"
              />
              <span className="text-[13px] text-[var(--muted)]">of {total || "…"}</span>
              <button
                type="submit"
                className="ml-auto h-12 rounded-xl bg-[var(--accent)] px-5 text-[14px] font-medium text-[var(--on-accent)] transition hover:brightness-110"
              >
                Go
              </button>
            </form>

            {total > 1 && (
              <label className="mt-5 block">
                <span className="flex items-center justify-between text-[11px] text-[var(--muted)]">
                  <span>Drag to skim</span>
                  <span className="tabular-nums">{draft || current}</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={total}
                  step={1}
                  value={Math.min(total, Math.max(1, Number(draft) || current))}
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setError(null);
                  }}
                  className="mt-1 h-11 w-full accent-[var(--accent)]"
                />
              </label>
            )}

            {error && (
              <p id={`${titleId}-error`} role="alert" className="mt-3 text-[12px] text-red-600">
                {error}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
