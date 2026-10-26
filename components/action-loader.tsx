"use client";

// While an action is running (any save, delete or upload: a TanStack
// mutation) for longer than DELAY_MS, the riding scooter shows at the bottom
// of the screen. Quick actions finish before it appears, so it never flickers,
// and it doesn't block the page.
import { useIsMutating } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BikeLoader } from "@/components/bike-loader";

const DELAY_MS = 350;

export function ActionLoader() {
  const busy = useIsMutating() > 0;
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(busy), busy ? DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [busy]);

  if (!show) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div className="w-60 rounded-2xl border bg-background/95 p-3 pb-2 shadow-lg backdrop-blur animate-in fade-in slide-in-from-bottom-4">
        <BikeLoader label="Working on it…" />
      </div>
    </div>
  );
}
