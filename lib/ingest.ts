import type { BookFormat, BookMeta } from "./types";
import { fileStem } from "./format";

export interface Ingested {
  meta: BookMeta;
  file: File;
}

export function detectFormat(file: File): BookFormat | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/epub+zip" || name.endsWith(".epub")) return "epub";
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  return null;
}

export async function ingestFile(file: File): Promise<Ingested | null> {
  const format = detectFormat(file);
  if (!format) return null;
  const id = crypto.randomUUID();
  const fallbackTitle = fileStem(file.name);
  const meta =
    format === "epub"
      ? await epubMeta(file, id, fallbackTitle)
      : await pdfMeta(file, id, fallbackTitle);
  return { meta: { ...meta, id, format, addedAt: Date.now() }, file };
}

async function epubMeta(file: File, _id: string, fallbackTitle: string): Promise<BookMeta> {
  const ePub = (await import("epubjs")).default;
  const buffer = await file.arrayBuffer();
  const book = ePub(buffer);
  let title = fallbackTitle;
  let author: string | undefined;
  let cover: string | undefined;
  try {
    const metadata = await book.loaded.metadata;
    title = metadata.title?.trim() || fallbackTitle;
    author = metadata.creator?.trim() || undefined;
    const url = await book.coverUrl();
    if (url) cover = await imageToDataUrl(url, 480);
  } finally {
    book.destroy();
  }
  return { id: "", title, author, format: "epub", cover, addedAt: 0 };
}

async function loadPdf() {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  return pdfjs;
}

async function pdfMeta(file: File, _id: string, fallbackTitle: string): Promise<BookMeta> {
  const pdfjs = await loadPdf();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  try {
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 480 / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      try {
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      } catch {
        // a cancelled first render still leaves the canvas usable for a cover
      }
    }
    const cover = canvas.toDataURL("image/jpeg", 0.8);
    return {
      id: "",
      title: fallbackTitle,
      format: "pdf",
      cover,
      pages: doc.numPages,
      addedAt: 0,
    };
  } finally {
    await (doc as unknown as { destroy?: () => Promise<void> }).destroy?.();
  }
}

async function imageToDataUrl(src: string, maxWidth: number): Promise<string | undefined> {
  try {
    const img = await loadImage(src);
    const scale = Math.min(1, maxWidth / img.naturalWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return undefined;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("cover failed"));
    img.src = src;
  });
}
