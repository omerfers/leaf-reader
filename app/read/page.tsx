"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ReaderView } from "@/components/reader/ReaderView";

function Reader() {
  const id = useSearchParams().get("id") ?? "";
  return <ReaderView id={id} />;
}

export default function ReadPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-[var(--bg)]">
          <p className="animate-pulse text-sm text-[var(--muted)]">Opening the book…</p>
        </div>
      }
    >
      <Reader />
    </Suspense>
  );
}
