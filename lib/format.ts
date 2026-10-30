import type { Progress } from "./types";

export function percentLabel(progress?: Progress): string | null {
  if (!progress) return null;
  if (progress.kind === "epub") return `${Math.round(progress.percent * 100)}%`;
  return `${Math.round((progress.page / Math.max(1, progress.total)) * 100)}%`;
}

export function progressFraction(progress?: Progress): number {
  if (!progress) return 0;
  if (progress.kind === "epub") return Math.min(1, Math.max(0, progress.percent));
  return Math.min(1, Math.max(0, progress.page / Math.max(1, progress.total)));
}

export function timeAgo(timestamp?: number): string {
  if (!timestamp) return "Not opened yet";
  const diff = Date.now() - timestamp;
  const day = 86_400_000;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)} min ago`;
  if (diff < day) return `${Math.round(diff / 3_600_000)} h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)} d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function fileStem(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}
