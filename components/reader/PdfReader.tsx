"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReaderSettings } from "@/lib/types";
import type { SelectionInfo } from "./TranslatePopover";

export function PdfReader({
  file,
  initialPage,
  settings,
  onProgress,
  onSelect,
  onClearSelection,
}: {
  file: Blob;
  initialPage?: number;
  settings: ReaderSettings;
  onProgress: (page: number, total: number) => void;
  onSelect: (selection: SelectionInfo) => void;
  onClearSelection: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<any>(null);
  const pdfjsRef = useRef<any>(null);
  const renderTask = useRef<any>(null);
  const renderSeq = useRef(0);
  const [page, setPage] = useState(initialPage ?? 1);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [turning, setTurning] = useState<"next" | "prev" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        pdfjsRef.current = pdfjs;
        const data = new Uint8Array(await file.arrayBuffer());
        const doc = await pdfjs.getDocument({ data }).promise;
        if (cancelled) return;
        docRef.current = doc;
        setTotal(doc.numPages);
        setState("ready");
        onProgress(page, doc.numPages);
      } catch (error) {
        console.error(error);
        if (!cancelled) setState("error");
      }
    })();
    return () => {
      cancelled = true;
      renderTask.current?.cancel?.();
      docRef.current?.destroy?.();
      docRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const paint = useCallback(async () => {
    const doc = docRef.current;
    const pdfjs = pdfjsRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const textLayerDiv = textRef.current;
    if (!doc || !pdfjs || !stage || !canvas || !textLayerDiv) return;

    const seq = ++renderSeq.current;
    const previous = renderTask.current;
    renderTask.current = null;
    previous?.cancel?.();
    try {
      await previous?.promise;
    } catch {
      // the previous page was cancelled on purpose
    }
    if (seq !== renderSeq.current) return;

    const pdfPage = await doc.getPage(page);
    if (seq !== renderSeq.current) return;
    const base = pdfPage.getViewport({ scale: 1 });
    const padding = 28;
    const availableWidth = Math.max(120, stage.clientWidth - padding * 2);
    const availableHeight = Math.max(160, stage.clientHeight - padding * 2);
    const scale = Math.min(availableWidth / base.width, availableHeight / base.height);
    const viewport = pdfPage.getViewport({ scale });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const task = pdfPage.render({
      canvas,
      canvasContext: ctx,
      viewport,
      transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
    });
    renderTask.current = task;
    try {
      await task.promise;
    } catch (error) {
      if ((error as Error)?.name !== "RenderingCancelledException") throw error;
      return;
    }
    if (seq !== renderSeq.current) return;

    textLayerDiv.replaceChildren();
    textLayerDiv.style.width = `${Math.floor(viewport.width)}px`;
    textLayerDiv.style.height = `${Math.floor(viewport.height)}px`;
    textLayerDiv.style.setProperty("--scale-factor", String(viewport.scale));
    try {
      const layer = new pdfjs.TextLayer({
        textContentSource: pdfPage.streamTextContent(),
        container: textLayerDiv,
        viewport,
      });
      await layer.render();
    } catch (error) {
      console.error("[leaf] text layer failed", error);
      const content = await pdfPage.getTextContent();
      const fallback = new pdfjs.TextLayer({
        textContentSource: content,
        container: textLayerDiv,
        viewport,
      });
      await fallback.render();
    }
  }, [page]);

  useEffect(() => {
    if (state !== "ready") return;
    void paint();
  }, [page, paint, state]);

  useEffect(() => {
    if (state !== "ready") return;
    onProgress(page, total);
  }, [onProgress, page, state, total]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => void paint());
    });
    observer.observe(stage);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [paint]);

  const go = useCallback(
    (direction: "next" | "prev") => {
      setPage((current) => {
        const target = direction === "next" ? current + 1 : current - 1;
        if (target < 1 || target > total) return current;
        setTurning(direction);
        window.setTimeout(() => setTurning(null), 360);
        onClearSelection();
        return target;
      });
    },
    [onClearSelection, total],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go("next");
      }
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go("prev");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const handleSelect = () => {
    const selection = window.getSelection();
    const text = selection?.toString().replace(/\s+/g, " ").trim();
    if (!selection || !text || selection.rangeCount === 0) {
      onClearSelection();
      return;
    }
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    onSelect({ text, rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height } });
  };

  const pdfFilter =
    settings.theme === "dark"
      ? "brightness(0.82) contrast(0.96)"
      : settings.theme === "sepia"
        ? "sepia(0.28) brightness(0.98) contrast(0.97)"
        : undefined;

  return (
    <div
      ref={stageRef}
      className="relative grid h-full w-full place-items-center overflow-hidden rounded-[3px_6px_6px_3px] bg-[var(--page)] shadow-[0_24px_50px_-40px_rgba(25,15,4,0.8)]"
    >
      <div className="relative" style={{ filter: pdfFilter }}>
        <canvas ref={canvasRef} className="block rounded-[2px] shadow-[0_10px_30px_-22px_rgba(0,0,0,0.7)]" />
        <div
          ref={textRef}
          className="textLayer"
          onMouseUp={handleSelect}
          onTouchEnd={handleSelect}
        />
      </div>

      <button
        type="button"
        aria-label="Previous page"
        onClick={() => go("prev")}
        disabled={page <= 1}
        className="absolute inset-y-0 left-0 z-10 w-[8%] cursor-w-resize disabled:cursor-default"
      />
      <button
        type="button"
        aria-label="Next page"
        onClick={() => go("next")}
        disabled={page >= total}
        className="absolute inset-y-0 right-0 z-10 w-[8%] cursor-e-resize disabled:cursor-default"
      />

      {turning && <div className={`turn-sheet ${turning}`} />}

      {state !== "ready" && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[var(--page)]">
          <p className="text-xs tracking-[0.18em] text-[var(--muted)] uppercase">
            {state === "loading" ? "Setting the page…" : "This PDF could not be opened."}
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[10px] tracking-[0.14em] text-white/90 tabular-nums">
        {page} / {total || "…"}
      </div>
    </div>
  );
}
