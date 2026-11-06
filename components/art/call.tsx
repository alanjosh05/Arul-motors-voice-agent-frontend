"use client";

import { HairlineFigure } from "@/components/hairline-figure";

/** No calls: a desk phone whose handset lifts as you near it (hairline/idle-phone.js). */
export function CallArt({ className }: { className?: string }) {
  return <HairlineFigure name="idle-phone" className={className} />;
}
