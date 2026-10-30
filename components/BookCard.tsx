"use client";

import Link from "next/link";
import type { BookMeta, Progress } from "@/lib/types";
import { percentLabel, progressFraction } from "@/lib/format";

const FALLBACK_COLORS = [
  ["#7c5a3a", "#3d2a17"],
  ["#4f5f6b", "#232c33"],
  ["#6b4f56", "#2f2126"],
  ["#5b6b52", "#28301f"],
  ["#7a6244", "#332716"],
];

function fallbackCover(book: BookMeta) {
  let hash = 0;
  for (const ch of book.title) hash = (hash + ch.charCodeAt(0)) % 997;
  return FALLBACK_COLORS[hash % FALLBACK_COLORS.length];
}

export function BookCard({
  book,
  progress,
  onDelete,
}: {
  book: BookMeta;
  progress?: Progress;
  onDelete: (book: BookMeta) => void;
}) {
  const fraction = progressFraction(progress);
  const label = percentLabel(progress);
  const [from, to] = fallbackCover(book);

  return (
    <div className="shelf-book group relative">
      <Link href={`/read/${book.id}`} className="block outline-none" aria-label={`Read ${book.title}`}>
        <div className="book-cover aspect-[2/3]">
          {book.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={book.cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex h-full w-full flex-col justify-between p-3 text-[#f4e8d2]"
              style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}
            >
              <span className="text-[9px] tracking-[0.22em] uppercase opacity-70">
                {book.format}
              </span>
              <span className="font-serif text-[15px] leading-tight">{book.title}</span>
            </div>
          )}
          {fraction > 0.01 && (
            <span className="absolute inset-x-0 bottom-0 z-[2] h-[3px] bg-black/25">
              <span
                className="block h-full bg-[#e6c9a0]"
                style={{ width: `${fraction * 100}%` }}
              />
            </span>
          )}
        </div>
      </Link>

      <div className="mt-2 flex items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="shelf-title" title={book.title}>
            {book.title}
          </p>
          <p className="shelf-meta">
            {book.author ?? `${book.format.toUpperCase()}${label ? ` · ${label}` : ""}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onDelete(book)}
          aria-label={`Remove ${book.title}`}
          className="shelf-delete shrink-0 rounded-full p-1 opacity-100 transition focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M9 7V5h6v2M7 7l1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
