"use client";

import { useEffect, useRef, useState } from "react";
import { translate, type Translation } from "@/lib/translate";

export interface SelectionInfo {
  text: string;
  rect: { x: number; y: number; width: number; height: number };
}

export function TranslatePopover({
  selection,
  targetLang,
  onClose,
}: {
  selection: SelectionInfo;
  targetLang: string;
  onClose: () => void;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "done"; value: Translation } | { status: "error"; message: string }
  >({ status: "loading" });
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    translate(selection.text, targetLang)
      .then((value) => {
        if (!controller.signal.aborted) setState({ status: "done", value });
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) setState({ status: "error", message: error.message });
      });
    return () => controller.abort();
  }, [selection.text, targetLang]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const width = 360;
  const left = Math.min(
    Math.max(12, selection.rect.x + selection.rect.width / 2 - width / 2),
    Math.max(12, window.innerWidth - width - 12),
  );
  const top = Math.min(selection.rect.y + selection.rect.height + 10, window.innerHeight - 220);

  return (
    <div
      ref={ref}
      className="pop-in fixed z-50 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]"
      style={{ left, top, width }}
      role="dialog"
      aria-label="Translation"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-[11px] leading-snug text-muted italic">
          “{selection.text.replace(/\s+/g, " ").slice(0, 180)}”
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close translation"
          className="-mt-1 -mr-1 shrink-0 rounded-full p-1 text-muted hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="my-2 h-px bg-[var(--line)]" />

      {state.status === "loading" ? (
        <div className="space-y-2" aria-live="polite">
          <div className="h-3 w-5/6 animate-pulse rounded bg-[var(--surface-2)]" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-[var(--surface-2)]" />
          <p className="pt-1 text-[10px] tracking-[0.14em] text-muted uppercase">Translating…</p>
        </div>
      ) : state.status === "error" ? (
        <p className="text-xs text-red-600">Could not translate: {state.message}</p>
      ) : (
        <>
          <p className="max-h-44 overflow-y-auto text-[14px] leading-relaxed" lang={targetLang}>
            {state.value.text}
          </p>
          <div className="mt-2 flex items-center justify-between text-[10px] tracking-[0.12em] text-muted uppercase">
            <span>
              {state.value.detected ?? "auto"} → {targetLang} · {state.value.provider}
            </span>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(state.value.text);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              }}
              className="rounded px-1 py-0.5 normal-case tracking-normal hover:text-[var(--ink)]"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
