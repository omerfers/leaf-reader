"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Book, Rendition } from "epubjs";
import type { Annotation, ReaderSettings } from "@/lib/types";
import type { SelectionInfo } from "./TranslatePopover";

const PALETTES: Record<ReaderSettings["theme"], { bg: string; ink: string; soft: string; accent: string }> = {
  light: { bg: "#fffdf8", ink: "#2b2620", soft: "#8a7f6d", accent: "#8a5a34" },
  sepia: { bg: "#f7edd9", ink: "#463726", soft: "#8a7556", accent: "#8a5a34" },
  dark: { bg: "#1c1915", ink: "#e6dcc8", soft: "#a29886", accent: "#d0a872" },
};

const MARGINS: Record<ReaderSettings["margin"], number> = { narrow: 16, normal: 42, wide: 76 };

export function EpubReader({
  file,
  initialCfi,
  settings,
  jump,
  annotations,
  onProgress,
  onSelect,
  onClearSelection,
  onBookTap,
}: {
  file: Blob;
  initialCfi?: string;
  settings: ReaderSettings;
  jump?: { cfi?: string; percent?: number; page?: number; nonce: number };
  annotations: Annotation[];
  onProgress: (cfi: string, percent: number, excerpt: string, page?: number, total?: number) => void;
  onSelect: (selection: SelectionInfo) => void;
  onClearSelection: () => void;
  onBookTap?: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const settingsRef = useRef(settings);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    settingsRef.current = settings;
    selectRef.current = onSelect;
    clearRef.current = onClearSelection;
    tapRef.current = onBookTap;
  }, [onBookTap, onClearSelection, onSelect, settings]);

  const turnRef = useRef<(direction: "next" | "prev") => void>(() => {});
  const navSeq = useRef(0);
  const selectRef = useRef(onSelect);
  const clearRef = useRef(onClearSelection);
  const tapRef = useRef(onBookTap);
  const languageRef = useRef<string | undefined>(undefined);
  const annotationsRef = useRef<Annotation[]>([]);

  const paint = useCallback((rendition: Rendition, current: ReaderSettings) => {
    // the rendition is torn down with the view; never touch a dead one
    if (!rendition.themes) return;
    const palette = PALETTES[current.theme];
    rendition.themes.register("leaf", {
      body: {
        background: palette.bg,
        color: palette.ink,
        "font-family": "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
        "line-height": String(current.lineHeight),
        padding: `0 ${MARGINS[current.margin]}px`,
        "box-sizing": "border-box",
      },
      // justified text on a narrow screen needs hyphens to avoid wide gaps
      "p, li, blockquote, div": {
        "line-height": String(current.lineHeight),
        hyphens: "auto",
        "-webkit-hyphens": "auto",
      },
      a: { color: palette.accent },
      "::selection": { background: "rgba(138, 90, 52, 0.24)" },
      img: { "max-width": "100%" },
    });
    rendition.themes.select("leaf");
    rendition.themes.fontSize(`${current.fontSize}%`);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      setState("loading");
      const ePub = (await import("epubjs")).default;
      const buffer = await file.arrayBuffer();
      if (cancelled) return;

      const book = ePub(buffer);
      bookRef.current = book;
      // epub.js takes pixels here; "100%" is read as a 100px column and the book
      // is laid out as one enormous horizontal strip (no page turns).
      const rect = host.getBoundingClientRect();
      const width = Math.max(240, Math.round(rect.width));
      const height = Math.max(240, Math.round(rect.height));
      const rendition = book.renderTo(host, {
        width,
        height,
        flow: "paginated",
        spread: "none",
        allowScriptedContent: false,
      });
      renditionRef.current = rendition;
      paint(rendition, settingsRef.current);

      const report = (location: any) => {
        const start = location?.start;
        if (!start) return;
        const fromLocations =
          bookRef.current?.locations?.percentageFromCfi?.(start.cfi) ?? undefined;
        const percent =
          typeof fromLocations === "number"
            ? fromLocations
            : typeof start.percentage === "number"
              ? start.percentage
              : 0;
        let excerpt = "";
        try {
          const contents = rendition.getContents?.() as unknown as Array<{
            document?: Document;
          }>;
          excerpt = (contents?.[0]?.document?.body?.innerText ?? "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 140);
        } catch (error) {
          console.error("[leaf] draw failed", error);
        }
        const locations = bookRef.current?.locations as unknown as
          | { locationFromCfi?: (cfi: string) => number; total?: number }
          | undefined;
        const index = locations?.locationFromCfi?.(start.cfi);
        const page = typeof index === "number" && index >= 0 ? index + 1 : undefined;
        const total = typeof locations?.total === "number" && locations.total > 0 ? locations.total : undefined;
        onProgress(start.cfi ?? "", percent, excerpt, page, total);
      };

      // Swipes, keys and selection happen inside the book's iframe. Bind once
      // per document; epub.js may reuse a view when only the page changes.
      const bound = new WeakSet<Document>();
      const bindContents = (contents: any) => {
        const doc: Document | undefined = contents?.document;
        if (!doc || bound.has(doc)) return;
        bound.add(doc);
        doc.addEventListener("pointerdown", () => tapRef.current?.());
        if (languageRef.current && !doc.documentElement.lang) {
          doc.documentElement.lang = languageRef.current;
        }
        let startX = 0;
        let startY = 0;
        let startedAt = 0;
        doc.addEventListener(
          "touchstart",
          (event: TouchEvent) => {
            if (event.touches.length !== 1) return;
            startX = event.touches[0].clientX;
            startY = event.touches[0].clientY;
            startedAt = Date.now();
          },
          { passive: true },
        );
        doc.addEventListener(
          "touchend",
          (event: TouchEvent) => {
            const touch = event.changedTouches[0];
            if (!touch) return;
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;
            const quick = Date.now() - startedAt < 700;
            if (quick && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) {
              turnRef.current(dx < 0 ? "next" : "prev");
            }
          },
          { passive: true },
        );

        // Keys are heard inside the iframe too; the page may have focus there
        // after a jump or a tap.
        doc.addEventListener("keydown", (event: KeyboardEvent) => {
          if (event.key === "ArrowRight" || event.key === "PageDown") {
            event.preventDefault();
            turnRef.current("next");
          }
          if (event.key === "ArrowLeft" || event.key === "PageUp") {
            event.preventDefault();
            turnRef.current("prev");
          }
        });

        // Selection is tracked here rather than through the rendition event, so
        // it keeps working after a jump replaces the contents.
        let timer: number | undefined;
        doc.addEventListener("selectionchange", () => {
          // Hidden views from earlier sections stay alive; their empty
          // selections must not clear the one the reader can actually see.
          const active = (
            renditionRef.current?.getContents?.() as unknown as
              | Array<{ document?: Document }>
              | undefined
          )?.[0]?.document;
          if (active && active !== doc) return;
          if (timer) window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            const selection = doc.defaultView?.getSelection?.();
            const text = selection?.toString().replace(/\s+/g, " ").trim();
            if (!selection || !text || selection.rangeCount === 0) {
              clearRef.current();
              return;
            }
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
            let cfi: string | undefined;
            try {
              cfi = contents.cfiFromRange?.(range);
            } catch {}
            selectRef.current({
              text,
              cfiRange: cfi,
              rect: {
                x: (frame?.left ?? 0) + rect.left,
                y: (frame?.top ?? 0) + rect.top,
                width: rect.width,
                height: rect.height,
              },
            });
          }, 220);
        });
      };

      rendition.hooks.content.register(bindContents);
      rendition.on("rendered", () => {
        host.querySelectorAll("iframe").forEach((frame) => {
          if (!frame.title) frame.title = "Book text";
        });
        (rendition.getContents?.() as unknown as any[] | undefined)?.forEach(bindContents);
      });
      rendition.on("relocated", () => {
        (rendition.getContents?.() as unknown as any[] | undefined)?.forEach(bindContents);
      });

      rendition.on("relocated", report);

      resizeObserver = new ResizeObserver(() => {
        const box = host.getBoundingClientRect();
        const w = Math.max(240, Math.round(box.width));
        const h = Math.max(240, Math.round(box.height));
        try {
          (rendition as unknown as { resize: (w: number, h: number) => void }).resize(w, h);
        } catch {}
      });
      resizeObserver.observe(host);

      const drawAnnotations = () => {
        const contents = (rendition.getContents?.() as unknown as Array<{
          document?: Document;
          range?: (cfi: string) => Range | null;
        }>)?.[0];
        const doc = contents?.document;
        const win = doc?.defaultView as (Window & { CSS?: { highlights?: Map<string, unknown> }; Highlight?: new (...ranges: Range[]) => { add: (r: Range) => void } }) | null;
        const highlights = win?.CSS?.highlights;
        if (!doc || !win || !highlights || !win.Highlight) return;

        for (const name of Array.from(highlights.keys())) {
          if (name.startsWith("leaf-")) highlights.delete(name);
        }

        let style = doc.getElementById("leaf-highlight-style");
        if (!style) {
          style = doc.createElement("style");
          style.id = "leaf-highlight-style";
          doc.head.appendChild(style);
        }
        const rules: string[] = [];

        for (const annotation of annotationsRef.current) {
          if (!annotation.cfi || !contents?.range) continue;
          try {
            const range = contents.range(annotation.cfi);
            if (!range) continue;
            const key = annotation.color.replace("#", "").toLowerCase();
            const name = `leaf-${annotation.kind}-${key}`;
            let highlight = highlights.get(name) as { add: (r: Range) => void } | undefined;
            if (!highlight) {
              highlight = new win.Highlight();
              highlights.set(name, highlight);
            }
            highlight.add(range);
            rules.push(
              annotation.kind === "underline"
                ? `::highlight(${name}){text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:${annotation.color};}`
                : `::highlight(${name}){background-color:${annotation.color}66;}`,
            );
          } catch {}
        }
        style.textContent = rules.join("\n");
      };
      annotationsRef.current = annotations;
      rendition.on("rendered", drawAnnotations);

      try {
        // epub.js keeps `linear` only when the itemref said linear="yes", while
        // the spec defaults to linear. Books that omit the attribute (most
        // commercial EPUBs) therefore lose their cover, title pages and table
        // of contents: display() starts past them and next()/prev() skip them.
        await book.ready;
        const language = (book.packaging as unknown as { metadata?: { language?: string } })
          ?.metadata?.language;
        if (language) languageRef.current = language.toLowerCase().split("-")[0];
        const spine = book.spine as unknown as {
          spineItems?: Array<{ linear: boolean; href: string }>;
        };
        const items = spine.spineItems ?? [];
        for (const item of items) item.linear = true;
        const firstHref = items[0]?.href;
        await rendition.display(initialCfi || firstHref || undefined);
        if (!cancelled) setState("ready");
        drawAnnotations();
        // epub.js needs a location index before it can give a percentage.
        book.ready
          .then(() => {
            if (cancelled) return undefined;
            return book.locations.generate(1600);
          })
          .then(() => {
            if (cancelled || !renditionRef.current) return;
            report(rendition.currentLocation());
          })
          .catch(() => {});
      } catch {
        if (!cancelled) setState("error");
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      const deadRendition = renditionRef.current;
      const deadBook = bookRef.current;
      renditionRef.current = null;
      bookRef.current = null;
      // epub.js keeps opening the archive after renderTo(); destroying too early
      // leaves it calling into a half-built Book (e.g. resources.replaceCss).
      void (async () => {
        try {
          await deadBook?.ready;
        } catch {}
        try {
          deadRendition?.destroy();
        } catch {}
        try {
          deadBook?.destroy();
        } catch {}
      })();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;
    paint(rendition, settings);
  }, [paint, settings]);

  const readLocation = useCallback(() => {
    const rendition = renditionRef.current;
    const locations = bookRef.current?.locations as unknown as
      | {
          locationFromCfi?: (cfi: string) => number;
          cfiFromLocation?: (index: number) => string;
          cfiFromPercentage?: (percent: number) => string;
          total?: number;
        }
      | undefined;
    const cfi = (rendition?.currentLocation?.() as unknown as { start?: { cfi?: string } } | undefined)
      ?.start?.cfi;
    const found = cfi && locations?.locationFromCfi ? locations.locationFromCfi(cfi) : undefined;
    return {
      cfi,
      index: typeof found === "number" && found >= 0 ? found : undefined,
      locations,
    };
  }, []);


  const goToPage = useCallback(
    async (desiredPage: number) => {
      const rendition = renditionRef.current;
      const { locations } = readLocation();
      if (!rendition) return;
      const desired = Math.max(0, Math.round(desiredPage) - 1);
      const seq = ++navSeq.current;
      if (desired === 0) {
        // The first location chunk is the first *text*, which sits after the
        // cover and title pages; page one should be the very first page.
        const spine = bookRef.current?.spine as unknown as
          | { spineItems?: Array<{ href: string }> }
          | undefined;
        const firstHref = spine?.spineItems?.[0]?.href;
        if (firstHref) {
          await rendition.display(firstHref);
          return;
        }
      }
      const cfi = locations?.cfiFromLocation?.(desired);
      if (cfi) {
        await rendition.display(cfi);
        await new Promise((resolve) => window.setTimeout(resolve, 170));
      }
      // Chunk boundaries rarely line up with rendered pages, so walk the last
      // few pages until the reported page number is the requested one. Visit
      // tracking stops the walk from bouncing between two nearby pages.
      const seen = new Set<number>();
      for (let step = 0; step < 16; step += 1) {
        if (seq !== navSeq.current) return;
        const current = readLocation().index;
        if (current === undefined) return;
        if (current === desired) return;
        if (seen.has(current)) return;
        seen.add(current);
        const moved = await Promise.resolve(
          current < desired ? rendition.next() : rendition.prev(),
        ).then(() => true).catch(() => false);
        if (!moved) return;
        await new Promise((resolve) => window.setTimeout(resolve, 130));
      }
    },
    [readLocation],
  );

  const turn = useCallback(
    (direction: "next" | "prev") => {
      const rendition = renditionRef.current;
      if (!rendition || turning) return;
      onClearSelection();
      setTurning(direction);
      window.setTimeout(() => setTurning(null), 360);
      const step = direction === "next" ? 1 : -1;
      const before = readLocation().index;
      void Promise.resolve(direction === "next" ? rendition.next() : rendition.prev()).then(
        () => {
          window.setTimeout(() => {
            const after = readLocation().index;
            if (before === undefined) return;
            if (after !== undefined && after !== before) return;
            // The pagination manager can stall right after a display() jump.
            void goToPage(before + 1 + step);
          }, 320);
        },
      );
    },
    [goToPage, onClearSelection, readLocation, turning],
  );

  useEffect(() => {
    if (!jump) return;
    const rendition = renditionRef.current;
    if (!rendition) return;
    const locations = bookRef.current?.locations as unknown as
      | { cfiFromPercentage?: (percentage: number) => string }
      | undefined;
    if (!jump.cfi && typeof jump.page === "number") {
      onClearSelection();
      void goToPage(jump.page);
      return;
    }
    let target = jump.cfi;
    if (!target && typeof jump.percent === "number") {
      target = locations?.cfiFromPercentage?.(Math.min(1, Math.max(0, jump.percent)));
    }
    if (!target) return;
    onClearSelection();
    void rendition.display(target);
  }, [goToPage, jump, onClearSelection]);

  useEffect(() => {
    turnRef.current = turn;
  }, [turn]);

  useEffect(() => {
    annotationsRef.current = annotations;
    const rendition = renditionRef.current;
    const contents = (rendition?.getContents?.() as unknown as Array<{
      document?: Document;
      range?: (cfi: string) => Range | null;
    }>)?.[0];
    const doc = contents?.document;
    const win = doc?.defaultView as (Window & { CSS?: { highlights?: Map<string, unknown> }; Highlight?: new (...ranges: Range[]) => { add: (r: Range) => void } }) | null;
    const highlights = win?.CSS?.highlights;
    if (!rendition || !doc || !win || !highlights || !win.Highlight) return;

    for (const name of Array.from(highlights.keys())) {
      if (name.startsWith("leaf-")) highlights.delete(name);
    }
    let style = doc.getElementById("leaf-highlight-style");
    if (!style) {
      style = doc.createElement("style");
      style.id = "leaf-highlight-style";
      doc.head.appendChild(style);
    }
    const rules: string[] = [];
    for (const annotation of annotations) {
      if (!annotation.cfi || !contents?.range) continue;
      try {
        const range = contents.range(annotation.cfi);
        if (!range) continue;
        const key = annotation.color.replace("#", "").toLowerCase();
        const name = `leaf-${annotation.kind}-${key}`;
        let highlight = highlights.get(name) as { add: (r: Range) => void } | undefined;
        if (!highlight) {
          highlight = new win.Highlight();
          highlights.set(name, highlight);
        }
        highlight.add(range);
        rules.push(
          annotation.kind === "underline"
            ? `::highlight(${name}){text-decoration:underline;text-decoration-thickness:2px;text-decoration-color:${annotation.color};}`
            : `::highlight(${name}){background-color:${annotation.color}66;}`,
        );
      } catch {}
    }
    style.textContent = rules.join("\n");
  }, [annotations]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        turn("next");
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        turn("prev");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[3px_6px_6px_3px] bg-[var(--page)] shadow-[0_24px_50px_-40px_rgba(25,15,4,0.8)]">
      <div ref={hostRef} className="epub-host h-full w-full" />

      <button
        type="button"
        aria-label="Previous page"
        onClick={() => turn("prev")}
        className="absolute inset-y-0 left-0 z-10 w-[14%] cursor-w-resize opacity-0 focus-visible:opacity-100 sm:w-[7%]"
      />
      <button
        type="button"
        aria-label="Next page"
        onClick={() => turn("next")}
        className="absolute inset-y-0 right-0 z-10 w-[14%] cursor-e-resize opacity-0 focus-visible:opacity-100 sm:w-[7%]"
      />

      {turning && <div className={`turn-sheet ${turning}`} />}

      {state !== "ready" && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[var(--page)]">
          <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
            {state === "loading" ? "Setting the page…" : "This book could not be opened."}
          </p>
        </div>
      )}
    </div>
  );
}
