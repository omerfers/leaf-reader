import { Suspense } from "react";
import { ReaderView } from "@/components/reader/ReaderView";

async function Reader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReaderView id={id} />;
}

export default function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-dvh place-items-center bg-[var(--bg)]">
          <p className="animate-pulse text-sm text-[var(--muted)]">Opening the book…</p>
        </div>
      }
    >
      <Reader params={params} />
    </Suspense>
  );
}
