"use client";

import { useEffect, useState } from "react";
import type { SelectionInfo } from "./TranslatePopover";

interface Entry {
  word: string;
  phonetic?: string;
  meanings: Array<{
    partOfSpeech: string;
    definitions: Array<{ definition: string; example?: string }>;
  }>;
}

type State =
  | { status: "loading" }
  | { status: "done"; entry: Entry }
  | { status: "missing" }
  | { status: "error" };

/** A single English word, optionally with an apostrophe or hyphen. */
export function isSingleWord(text: string) {
  return /^[\p{L}][\p{L}'’-]{0,39}$/u.test(text.trim());
}

export function DefinePopover({
  selection,
  onClose,
  onTranslate,
}: {
  selection: SelectionInfo;
  onClose: () => void;
  onTranslate: () => void;
}) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const word = selection.text.trim().toLowerCase();
    fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 404) return setState({ status: "missing" });
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as Entry[];
        if (!data[0]?.meanings?.length) return setState({ status: "missing" });
        setState({ status: "done", entry: data[0] });
      })
      .catch((error: Error) => {
        if (error.name !== "AbortError") setState({ status: "error" });
      });
    return () => controller.abort();
  }, [selection.text]);

  const width = 320;
  const left = Math.min(
    Math.max(12, selection.rect.x + selection.rect.width / 2 - width / 2),
    Math.max(12, window.innerWidth - width - 12),
  );
  const top = Math.min(selection.rect.y + selection.rect.height + 10, window.innerHeight - 260);

  return (
    <div
      data-panel
      role="dialog"
      aria-label={`Definition of ${selection.text}`}
      className="pop-in fixed z-50 max-h-[60vh] overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]"
      style={{ left, top, width: `min(${width}px, calc(100vw - 24px))` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-serif text-[17px]">{selection.text.trim()}</p>
          {state.status === "done" && state.entry.phonetic && (
            <p className="text-[11px] text-muted">{state.entry.phonetic}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close definition"
          className="-mt-2 -mr-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="my-2 h-px bg-[var(--line)]" />

      {state.status === "loading" && (
        <p className="text-[11px] tracking-[0.14em] text-muted uppercase" aria-live="polite">
          Looking up…
        </p>
      )}

      {state.status === "missing" && (
        <p className="text-[12px] leading-relaxed text-muted">
          No definition found. Words from other languages are not in the dictionary.
        </p>
      )}

      {state.status === "error" && (
        <p className="text-[12px] leading-relaxed text-red-600">The dictionary could not be reached.</p>
      )}

      {state.status === "done" && (
        <div className="space-y-3">
          {state.entry.meanings.slice(0, 4).map((meaning, index) => (
            <div key={`${meaning.partOfSpeech}-${index}`}>
              <p className="text-[10px] tracking-[0.12em] text-muted uppercase italic">{meaning.partOfSpeech}</p>
              <ol className="mt-1 list-decimal space-y-1.5 pl-4 text-[13px] leading-snug">
                {meaning.definitions.slice(0, 3).map((definition, position) => (
                  <li key={position}>
                    {definition.definition}
                    {definition.example && (
                      <span className="mt-0.5 block text-[12px] text-muted italic">“{definition.example}”</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={onTranslate}
          className="h-9 rounded-full px-3 text-[10px] font-semibold tracking-[0.12em] text-[var(--accent)] uppercase transition hover:bg-[var(--accent)]/10"
        >
          Translate instead
        </button>
      </div>
    </div>
  );
}
