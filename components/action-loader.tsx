"use client";

// The riding scooter at the bottom of the screen, shown for every create,
// read, update and delete: while an action runs (lib/activity.ts: saving,
// deleting, uploading, opening a file) or a page's data is loading for the
// first time. It stays at least MIN_MS so even quick actions are seen, and it
// doesn't block the page.
import { useIsFetching } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BikeLoader } from "@/components/bike-loader";
import { useActivity } from "@/lib/activity";

const MIN_MS = 800;

export function ActionLoader() {
  const action = useActivity();
  // First loads only: data a page is waiting for and doesn't have yet (not
  // background refreshes, and not the idle-time prefetch with no page on it).
  const reading = useIsFetching({ predicate: (q) => q.state.data === undefined && q.getObserversCount() > 0 }) > 0;
  const busy = action ?? (reading ? "Loading…" : null);
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    // Show straight away; once done, keep it up to MIN_MS so it doesn't flash.
    const timer = setTimeout(() => setShown(busy), busy ? 0 : MIN_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  if (!shown) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div className="w-60 rounded-2xl border bg-background/95 p-3 pb-2 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-4">
        <BikeLoader label={shown} />
      </div>
    </div>
  );
}
