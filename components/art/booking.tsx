"use client";

import { HairlineFigure } from "@/components/hairline-figure";

/** No bookings: a rail of day slots holding one blank card (hairline/day-rail.js). */
export function BookingArt({ className }: { className?: string }) {
  return <HairlineFigure name="day-rail" className={className} />;
}
