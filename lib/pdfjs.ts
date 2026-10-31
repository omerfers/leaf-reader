"use client";

// pdf.js ships two builds. The default one is smaller but needs a fairly new
// engine (Promise.withResolvers, Array.prototype.at, …). Android WebViews lag
// behind, so the legacy build (with a matching worker) is used there.

export type PdfJsModule = typeof import("pdfjs-dist");

let modern: Promise<PdfJsModule> | null = null;
let legacy: Promise<PdfJsModule> | null = null;

export function browserSupportsModernPdfJs() {
  if (typeof window === "undefined") return false;
  const promiseWithResolvers = (Promise as unknown as { withResolvers?: unknown })
    .withResolvers;
  return (
    typeof promiseWithResolvers === "function" &&
    typeof Array.prototype.at === "function" &&
    typeof (globalThis as unknown as { structuredClone?: unknown }).structuredClone ===
      "function"
  );
}

function workerUrl(path: string) {
  const base = typeof window === "undefined" ? "/" : window.location.href;
  try {
    return new URL(path, base).toString();
  } catch {
    return path;
  }
}

async function loadModern(): Promise<PdfJsModule> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl("/pdf.worker.min.mjs");
  return pdfjs;
}

async function loadLegacy(): Promise<PdfJsModule> {
  const pdfjs = (await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  )) as unknown as PdfJsModule;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl("/pdf.worker.legacy.min.mjs");
  return pdfjs;
}

export async function loadPdfJs(options?: { forceLegacy?: boolean }): Promise<PdfJsModule> {
  if (options?.forceLegacy) {
    legacy ??= loadLegacy();
    return legacy;
  }
  if (browserSupportsModernPdfJs()) {
    try {
      modern ??= loadModern();
      return await modern;
    } catch (error) {
      console.warn("Leaf: modern pdf.js failed, falling back to the legacy build", error);
    }
  }
  legacy ??= loadLegacy();
  return legacy;
}
