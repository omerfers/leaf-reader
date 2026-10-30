"use client";

import type { Bookmark } from "@/lib/types";

export function BookmarksPanel({
  bookmarks,
  onAdd,
  onJump,
  onRemove,
  onClose,
}: {
  bookmarks: Bookmark[];
  onAdd: () => void;
  onJump: (bookmark: Bookmark) => void;
  onRemove: (bookmark: Bookmark) => void;
  onClose: () => void;
}) {
  return (
    <div className="pop-in absolute top-3 right-3 z-40 flex max-h-[70vh] w-[300px] flex-col rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-[0_26px_60px_-30px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <p className="text-[10px] tracking-[0.18em] text-[var(--muted)] uppercase">Bookmarks</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close bookmarks"
          className="rounded-full p-1 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="p-3">
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--accent)]/50 px-3 py-2 text-[11px] font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/10"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 4h12v17l-6-4-6 4z" strokeLinejoin="round" />
            <path d="M12 8v5M9.5 10.5h5" strokeLinecap="round" />
          </svg>
          Bookmark this page
        </button>
      </div>

      <div className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2">
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
              <button
                type="button"
                onClick={() => onJump(bookmark)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="line-clamp-2 text-[11px] leading-snug text-[var(--ink)]">
                  {bookmark.label}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--muted)]">
                  {Math.round(bookmark.percent * 100)}% ·{" "}
                  {new Date(bookmark.createdAt).toLocaleDateString()}
                </p>
              </button>
              <button
                type="button"
                onClick={() => onRemove(bookmark)}
                aria-label="Delete bookmark"
                className="mt-0.5 shrink-0 rounded-full p-1 text-[var(--muted)] opacity-0 transition hover:bg-red-500/10 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
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
