"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Bookmark } from "@/lib/types";
import type { ReaderApi, ReaderTarget, SearchHit, TocEntry } from "@/lib/reader-api";

export type ContentsTab = "contents" | "search" | "bookmarks";

const TABS: Array<{ id: ContentsTab; label: string }> = [
  { id: "contents", label: "Contents" },
  { id: "search", label: "Search" },
  { id: "bookmarks", label: "Bookmarks" },
];

const SEARCH_LIMIT = 150;

export function ContentsPanel({
  tab,
  onTab,
  api,
  bookmarks,
  onAddBookmark,
  onRemoveBookmark,
  onJump,
  onClose,
}: {
  tab: ContentsTab;
  onTab: (tab: ContentsTab) => void;
  api: ReaderApi | null;
  bookmarks: Bookmark[];
  onAddBookmark: () => void;
  onRemoveBookmark: (bookmark: Bookmark) => void;
  onJump: (target: ReaderTarget) => void;
  onClose: () => void;
}) {
  const titleId = useId();
  return (
    <div
      data-panel
      role="dialog"
      aria-labelledby={titleId}
      className="pop-in absolute top-3 right-3 left-3 z-40 flex max-h-[75vh] flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_26px_60px_-30px_rgba(0,0,0,0.6)] sm:left-auto sm:w-[320px]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-2 py-1">
        <h2 id={titleId} className="sr-only">
          Contents, search and bookmarks
        </h2>
        <div role="tablist" aria-label="Contents, search and bookmarks" className="flex min-w-0 flex-1 gap-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${titleId}-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`${titleId}-panel`}
              onClick={() => onTab(item.id)}
              className={`h-10 flex-1 rounded-lg px-2 text-[11px] font-medium tracking-[0.04em] transition ${
                tab === item.id
                  ? "bg-[var(--accent)]/12 text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        id={`${titleId}-panel`}
        role="tabpanel"
        aria-labelledby={`${titleId}-${tab}`}
        className="thin-scroll min-h-0 flex-1 overflow-y-auto"
      >
        {tab === "contents" && <ContentsList api={api} onJump={onJump} />}
        {tab === "search" && <SearchList api={api} onJump={onJump} />}
        {tab === "bookmarks" && (
          <BookmarksList
            bookmarks={bookmarks}
            onAdd={onAddBookmark}
            onJump={(bookmark) => onJump({ cfi: bookmark.cfi, page: bookmark.page })}
            onRemove={onRemoveBookmark}
          />
        )}
      </div>
    </div>
  );
}

function ContentsList({ api, onJump }: { api: ReaderApi | null; onJump: (target: ReaderTarget) => void }) {
  const [entries, setEntries] = useState<TocEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!api) return;
    api
      .toc()
      .then((list) => {
        if (!cancelled) setEntries(list);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  if (!entries) {
    return <p className="px-4 py-6 text-center text-[11px] text-[var(--muted)]">Loading…</p>;
  }
  if (entries.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-[11px] leading-relaxed text-[var(--muted)]">
        This book has no table of contents.
      </p>
    );
  }
  return (
    <ul className="px-2 py-2">
      {entries.map((entry, index) => (
        <li key={`${index}-${entry.label}`}>
          <button
            type="button"
            onClick={() => onJump(entry.target)}
            className="flex w-full items-center rounded-lg py-2 pr-2 text-left text-[12px] leading-snug text-[var(--ink)] transition hover:bg-black/5"
            style={{ paddingLeft: 10 + Math.min(entry.depth, 4) * 14 }}
          >
            <span className="line-clamp-2">{entry.label}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SearchList({ api, onJump }: { api: ReaderApi | null; onJump: (target: ReaderTarget) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [ran, setRan] = useState("");
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = async (text: string) => {
    if (!api || !text.trim()) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setStatus("running");
    setHits([]);
    setRan(text.trim());
    setProgress({ done: 0, total: 0 });
    try {
      const result = await api.search(text, {
        signal: current.signal,
        limit: SEARCH_LIMIT,
        onProgress: (done, total) => {
          if (!current.signal.aborted) setProgress({ done, total });
        },
      });
      if (current.signal.aborted) return;
      setHits(result);
      setStatus("done");
    } catch {
      if (!current.signal.aborted) setStatus("error");
    }
  };

  return (
    <div className="p-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void run(query);
        }}
        className="flex items-center gap-2"
      >
        <label className="sr-only" htmlFor="contents-search">
          Search this book
        </label>
        <input
          id="contents-search"
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search this book"
          className="h-11 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface-2)] px-3 text-[16px] text-[var(--ink)] outline-none focus-visible:border-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={!api || !query.trim()}
          className="h-11 shrink-0 rounded-lg bg-[var(--accent)] px-4 text-[12px] font-medium text-[var(--on-accent)] transition hover:brightness-110 disabled:opacity-50"
        >
          Search
        </button>
      </form>

      <div aria-live="polite" className="mt-3 px-1 text-[11px] text-[var(--muted)]">
        {status === "running" && (
          <span>
            Searching{progress.total ? ` · ${Math.round((progress.done / progress.total) * 100)}%` : "…"}
          </span>
        )}
        {status === "done" && (
          <span>
            {hits.length === 0
              ? `No matches for “${ran}”.`
              : hits.length >= SEARCH_LIMIT
                ? `First ${SEARCH_LIMIT} matches for “${ran}”.`
                : `${hits.length} ${hits.length === 1 ? "match" : "matches"} for “${ran}”.`}
          </span>
        )}
        {status === "error" && <span className="text-red-600">The search could not finish.</span>}
      </div>

      <ul className="mt-2 space-y-1">
        {hits.map((hit, index) => (
          <li key={index}>
            <button
              type="button"
              onClick={() => onJump(hit.target)}
              className="w-full rounded-lg px-2 py-2 text-left text-[12px] leading-relaxed text-[var(--ink)] transition hover:bg-black/5"
            >
              {highlight(hit.excerpt, ran)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function highlight(text: string, term: string) {
  if (!term) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === term.toLowerCase() ? (
      <mark key={index} className="rounded-sm bg-[var(--accent)]/25 px-0.5 text-[var(--ink)]">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

export function BookmarksList({
  bookmarks,
  onAdd,
  onJump,
  onRemove,
}: {
  bookmarks: Bookmark[];
  onAdd: () => void;
  onJump: (bookmark: Bookmark) => void;
  onRemove: (bookmark: Bookmark) => void;
}) {
  return (
    <div>
      <div className="p-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent)]/50 px-3 text-[12px] font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 4h12v17l-6-4-6 4z" strokeLinejoin="round" />
            <path d="M12 8v5M9.5 10.5h5" strokeLinecap="round" />
          </svg>
          Bookmark this page
        </button>
      </div>

      <div className="px-2 pb-2">
        {bookmarks.length === 0 ? (
          <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-[var(--muted)]">
            No bookmarks yet. Add one here or from the header.
          </p>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="group flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-black/[0.04]"
            >
              <button type="button" onClick={() => onJump(bookmark)} className="min-w-0 flex-1 text-left">
                <p className="line-clamp-2 text-[11px] leading-snug text-[var(--ink)]">{bookmark.label}</p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                  {Math.round(bookmark.percent * 100)}% · {new Date(bookmark.createdAt).toLocaleDateString()}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onRemove(bookmark)}
                aria-label="Delete bookmark"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[var(--muted)] opacity-100 transition hover:bg-red-500/10 hover:text-red-600 sm:h-8 sm:w-8 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
