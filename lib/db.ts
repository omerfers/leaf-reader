import { del, get, set } from "idb-keyval";
import type { BookMeta, Progress, ReaderSettings } from "./types";

const BOOKS_KEY = "leaf.books";
const fileKey = (id: string) => `leaf.file.${id}`;
const progressKey = (id: string) => `leaf.progress.${id}`;
const SETTINGS_KEY = "leaf.settings";

export async function listBooks(): Promise<BookMeta[]> {
  return (await get<BookMeta[]>(BOOKS_KEY)) ?? [];
}

export async function saveBook(meta: BookMeta, file: Blob): Promise<void> {
  const books = await listBooks();
  const next = [...books.filter((b) => b.id !== meta.id), meta].sort(
    (a, b) => (b.lastOpenedAt ?? b.addedAt) - (a.lastOpenedAt ?? a.addedAt),
  );
  await set(fileKey(meta.id), file);
  await set(BOOKS_KEY, next);
}

export async function updateBook(id: string, patch: Partial<BookMeta>): Promise<BookMeta[]> {
  const books = await listBooks();
  const next = books.map((b) => (b.id === id ? { ...b, ...patch } : b));
  await set(BOOKS_KEY, next);
  return next;
}

export async function removeBook(id: string): Promise<BookMeta[]> {
  const books = await listBooks();
  const next = books.filter((b) => b.id !== id);
  await set(BOOKS_KEY, next);
  await del(fileKey(id));
  await del(progressKey(id));
  return next;
}

export async function getBook(id: string): Promise<BookMeta | undefined> {
  return (await listBooks()).find((b) => b.id === id);
}

export async function getFile(id: string): Promise<Blob | undefined> {
  return get<Blob>(fileKey(id));
}

export async function getProgress(id: string): Promise<Progress | undefined> {
  return get<Progress>(progressKey(id));
}

export async function saveProgress(id: string, progress: Progress): Promise<void> {
  await set(progressKey(id), progress);
}

export async function getSettings(): Promise<ReaderSettings | undefined> {
  return get<ReaderSettings>(SETTINGS_KEY);
}

export async function saveSettings(settings: ReaderSettings): Promise<void> {
  await set(SETTINGS_KEY, settings);
}
