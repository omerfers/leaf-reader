"use client";

// pdf.js ships two builds. The default one is smaller but needs a fairly new
// engine (Promise.withResolvers, Array.prototype.at, …). Android WebViews lag
// behind, so the legacy build (with a matching worker) is used there.

export type PdfJsModule = typeof import("pdfjs-dist");

let cached: Promise<PdfJsModule> | null = null;

function browserSupportsModernBuild() {
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

async function load(): Promise<PdfJsModule> {
  if (browserSupportsModernBuild()) {
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl("/pdf.worker.min.mjs");
      return pdfjs;
    } catch (error) {
      console.warn("Leaf: modern pdf.js failed, falling back to the legacy build", error);
    }
  }
  const legacy = (await import(
    "pdfjs-dist/legacy/build/pdf.mjs"
  )) as unknown as PdfJsModule;
  legacy.GlobalWorkerOptions.workerSrc = workerUrl("/pdf.worker.legacy.min.mjs");
  return legacy;
}

export function loadPdfJs(): Promise<PdfJsModule> {
  if (!cached) cached = load();
  return cached;
}

/** A second chance on very old engines: load the document on the main thread. */
export function disablePdfWorker(pdfjs: PdfJsModule) {
  pdfjs.GlobalWorkerOptions.workerSrc = "";
  (pdfjs.GlobalWorkerOptions as unknown as { workerPort?: MessagePort | null }).workerPort =
    null;
}
