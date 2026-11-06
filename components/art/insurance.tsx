"use client";

import { HairlineFigure } from "@/components/hairline-figure";

/** No insurance reminders: a shield on a plinth, thirty dim day-dots in front (hairline/shield.js). */
export function InsuranceArt({ className }: { className?: string }) {
  return <HairlineFigure name="shield" className={className} />;
}
