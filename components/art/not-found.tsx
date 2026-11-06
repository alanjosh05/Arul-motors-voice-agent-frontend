"use client";

import { HairlineFigure } from "@/components/hairline-figure";

/** 404: a road that ends at a barrier, and a signpost turning to face you (hairline/dead-end.js). */
export function NotFoundArt({ className }: { className?: string }) {
  return <HairlineFigure name="dead-end" className={className} />;
}
