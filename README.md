# Leaf

A quiet, local-first reading app for the books you already own. EPUB and PDF,
a Kindle-like page, and translation that appears **on the page** instead of
throwing you into another tab.

## What it does

- **Bookshelf** — drag any `.epub` or `.pdf` onto the page (or use *Add books*).
  Each book gets a cover, author, progress and a format badge.
- **EPUB reader** — real pagination (not scrolling), serif text, adjustable
  size / line spacing / margins, three page colours, and a page-turn animation.
- **PDF reader** — page-by-page with a selectable text layer and the same page
  turn; the colour setting dims the page for night reading.
- **Translate in place** — select a sentence and a small card appears over the
  text with the translation. No new page, no losing your spot.
- **Remembers you** — reading position (EPUB CFI or PDF page), last opened book
  and all settings are stored locally.
- **Light / sepia / dark** — for the shelf and the page; follows your system
  theme on first run.
- **Keyboard** — `←` / `→` (or `PageUp` / `PageDown`) to turn pages, `Esc` closes
  the translation card.

## Privacy

Books never leave the device: files and covers live in **IndexedDB**, and there
is no backend. The only network call is the translation request, which sends the
selected text to Google's public translate endpoint (MyMemory is used as a
fallback). Nothing is logged or stored server-side.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

## How it is built

- Next.js 16 (App Router, Turbopack) + React 19 + Tailwind CSS 4
- [`epub.js`](https://github.com/futurepress/epub.js) for EPUB rendering/pagination
- [`pdf.js`](https://mozilla.github.io/pdf.js/) for PDF pages and the text layer
- `idb-keyval` for the local library
- `next/font` (Inter for UI, Source Serif 4 for reading)

The PDF worker is vendored at `public/pdf.worker.min.mjs`. If you bump
`pdfjs-dist`, copy the new worker from `node_modules/pdfjs-dist/build/` again.

## Roadmap

- Highlights and margin notes
- Dictionary lookup next to translation
- Text-to-speech
- Collections and sorting on the shelf
- Optional end-to-end sync between devices
