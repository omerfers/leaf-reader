/** Where a contents entry or search hit takes the reader. */
export interface ReaderTarget {
  /** EPUB: a CFI or a section href */
  cfi?: string;
  /** PDF: a page number */
  page?: number;
}

export interface TocEntry {
  label: string;
  depth: number;
  target: ReaderTarget;
}

export interface SearchHit {
  excerpt: string;
  target: ReaderTarget;
}

/** What a reader exposes to the surrounding view once its book is open. */
export interface ReaderApi {
  toc(): Promise<TocEntry[]>;
  search(
    query: string,
    options: {
      signal: AbortSignal;
      onProgress: (done: number, total: number) => void;
      limit: number;
    },
  ): Promise<SearchHit[]>;
}

/** Shows the text around a match, trimmed to a readable length. */
export function excerptAround(text: string, index: number, length: number, radius = 60) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + length + radius);
  const clean = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "…" : ""}${clean}${end < text.length ? "…" : ""}`;
}
