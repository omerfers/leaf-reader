"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Book, Rendition } from "epubjs";
import type { ReaderSettings } from "@/lib/types";
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
  onProgress,
  onSelect,
  onClearSelection,
}: {
  file: Blob;
  initialCfi?: string;
  settings: ReaderSettings;
  onProgress: (cfi: string, percent: number) => void;
  onSelect: (selection: SelectionInfo) => void;
  onClearSelection: () => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const settingsRef = useRef(settings);
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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
      "p, li, blockquote, div": {
        "line-height": String(current.lineHeight),
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
    const host = hostRef.current;
    if (!host) return;

    (async () => {
      setState("loading");
      const ePub = (await import("epubjs")).default;
      const buffer = await file.arrayBuffer();
      if (cancelled) return;

      const book = ePub(buffer);
      bookRef.current = book;
      const rendition = book.renderTo(host, {
        width: "100%",
        height: "100%",
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
        onProgress(start.cfi ?? "", percent);
      };

      rendition.on("relocated", report);

      rendition.on("selected", (cfiRange: string, contents: any) => {
        const selection = contents?.window?.getSelection?.();
        const text = selection?.toString().replace(/\s+/g, " ").trim();
        if (!text || selection.rangeCount === 0) {
          onClearSelection();
          return;
        }
        const range = selection.getRangeAt(0).getBoundingClientRect();
        const frame = contents.document?.defaultView?.frameElement?.getBoundingClientRect();
        onSelect({
          text,
          rect: {
            x: (frame?.left ?? 0) + range.left,
            y: (frame?.top ?? 0) + range.top,
            width: range.width,
            height: range.height,
          },
        });
      });

      try {
        await rendition.display(initialCfi || undefined);
        if (!cancelled) setState("ready");
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

  const turn = useCallback(
    (direction: "next" | "prev") => {
      const rendition = renditionRef.current;
      if (!rendition || turning) return;
      onClearSelection();
      setTurning(direction);
      window.setTimeout(() => setTurning(null), 360);
      void (direction === "next" ? rendition.next() : rendition.prev());
    },
    [onClearSelection, turning],
  );

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
        className="absolute inset-y-0 left-0 z-10 w-[7%] cursor-w-resize opacity-0 focus-visible:opacity-100"
      />
      <button
        type="button"
        aria-label="Next page"
        onClick={() => turn("next")}
        className="absolute inset-y-0 right-0 z-10 w-[7%] cursor-e-resize opacity-0 focus-visible:opacity-100"
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
