"use client";

// The loading picture: the Arul Motors monogram (A and M) on a plinth, the M
// sliding out from behind the A and back, over and over (hairline/am-mark.js,
// made from the logo with /hairline-adopt). Nothing here is pointing, so the
// figure is swung by an unseen pointer (components/hairline-figure.tsx).
import { HairlineFigure } from "@/components/hairline-figure";
import { cn } from "@/lib/utils";

/** The loader, with an optional line of text under it. */
export function BikeLoader({ className, label = "Loading…" }: { className?: string; label?: string | null }) {
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-col items-center gap-3", className)}>
      <HairlineFigure name="am-mark" sweep className="h-auto w-full" />
      {label && <p className="text-sm font-medium text-muted-foreground">{label}</p>}
      {!label && <span className="sr-only">Loading</span>}
    </div>
  );
}
