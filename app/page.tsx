"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookCard } from "@/components/BookCard";
import { listBooks, removeBook, saveBook, getProgress } from "@/lib/db";
import { ingestFile } from "@/lib/ingest";
import type { BookMeta, Progress } from "@/lib/types";

export default function ShelfPage() {
  const [books, setBooks] = useState<BookMeta[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress | undefined>>({});
  const [theme, setTheme] = useState<"light" | "sepia" | "dark">("light");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const stored = await listBooks();
    setBooks(stored);
    const entries = await Promise.all(
      stored.map(async (book) => [book.id, await getProgress(book.id)] as const),
    );
    setProgress(Object.fromEntries(entries));
    setLoading(false);
  }, []);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as typeof theme) || "light";
    // the pre-hydration script already put the theme on <html>; mirror it here
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
    void refresh();
  }, [refresh]);

  const applyTheme = (next: typeof theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("leaf.theme", next);
    } catch {}
  };

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (let i = 0; i < list.length; i += 1) {
        const file = list[i];
        setBusy(`${file.name} (${i + 1}/${list.length})`);
        try {
          const ingested = await ingestFile(file);
          if (ingested) await saveBook(ingested.meta, ingested.file);
        } catch (error) {
          console.error("Could not import", file.name, error);
        }
      }
      setBusy(null);
      await refresh();
    },
    [refresh],
  );

  const handleDelete = async (book: BookMeta) => {
    if (!window.confirm(`Remove "${book.title}" from your shelf?`)) return;
    await removeBook(book.id);
    await refresh();
  };

  return (
    <div
      className={`shelf-scene grain ${dragging ? "ring-4 ring-inset ring-[var(--accent-soft)]" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={async (event) => {
        event.preventDefault();
        setDragging(false);
        if (event.dataTransfer.files.length) await addFiles(event.dataTransfer.files);
      }}
    >
      <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 sm:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4 pt-10 pb-8 sm:pt-14">
          <div>
            <h1 className="font-serif text-[42px] leading-none tracking-tight sm:text-[54px]">
              Leaf
            </h1>
            <p className="mt-2 text-[11px] tracking-[0.24em] text-muted uppercase">
              {books.length === 0
                ? "Your shelf is waiting"
                : `${books.length} ${books.length === 1 ? "book" : "books"} on the shelf`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle theme={theme} onChange={applyTheme} />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-xs font-medium text-white shadow-[0_10px_24px_-16px_rgba(0,0,0,0.8)] transition hover:brightness-110"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Add books
            </button>
            <input
              ref={inputRef}
              type="file"
              accept=".epub,.pdf,application/epub+zip,application/pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void addFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        </header>

        <div aria-hidden className="mb-8 h-[6px] rounded-full bg-gradient-to-b from-[var(--shelf-top)] via-[var(--shelf-mid)] to-[var(--shelf-edge)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_14px_20px_-14px_rgba(0,0,0,0.8)]" />

        {busy && (
          <p className="mb-6 text-xs text-muted" role="status">
            Importing {busy}…
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] rounded-[3px_7px_7px_3px] bg-[var(--surface-2)]" />
                <div className="mt-3 h-3 w-3/4 rounded bg-[var(--surface-2)]" />
              </div>
            ))}
          </div>
        ) : books.length === 0 ? (
          <EmptyShelf onAdd={() => inputRef.current?.click()} />
        ) : (
          <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {books.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                progress={progress[book.id]}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThemeToggle({
  theme,
  onChange,
}: {
  theme: "light" | "sepia" | "dark";
  onChange: (theme: "light" | "sepia" | "dark") => void;
}) {
  const order: Array<"light" | "sepia" | "dark"> = ["light", "sepia", "dark"];
  const next = order[(order.indexOf(theme) + 1) % order.length];
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      aria-label={`Switch to ${next} theme`}
      className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--surface)]/70 text-[var(--ink)] transition hover:bg-[var(--surface)]"
    >
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" strokeLinecap="round" />
        </svg>
      ) : theme === "sepia" ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 19V6a2 2 0 012-2h11a1 1 0 011 1v14H6a2 2 0 010-4h12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M20 14.5A8 8 0 119.5 4a6.5 6.5 0 0010.5 10.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function EmptyShelf({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)]/40 px-8 py-16 text-center">
      <svg viewBox="0 0 24 24" className="h-10 w-10 text-[var(--accent-soft)]" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13z" strokeLinejoin="round" />
        <path d="M8 7h8M8 11h6" strokeLinecap="round" />
      </svg>
      <h2 className="mt-4 font-serif text-2xl">Nothing here yet</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Drop an EPUB or PDF anywhere on this page, or add one from your library.
        Books stay on this device.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 rounded-full border border-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-white"
      >
        Add your first book
      </button>
    </div>
  );
}
