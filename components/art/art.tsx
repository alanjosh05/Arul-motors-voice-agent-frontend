"use client";

import { useRef } from "react";
import { useAnime } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** A decorative illustration (an SVG string from this repo, never user data).
 *  It pops in, then floats gently. */
export function Art({ svg, className }: { svg: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useAnime(
    ref,
    ({ animate }, el) => {
      animate(el, { opacity: [0, 1], scale: [0.85, 1], translateY: [10, 0], ease: "outBack", duration: 650 });
      animate(el, { translateY: [0, -6], ease: "inOutSine", duration: 2200, delay: 700, loop: true, alternate: true });
    },
    [],
  );
  return (
    <div
      ref={ref}
      aria-hidden
      className={cn("h-28 w-auto shrink-0 [&>svg]:h-full [&>svg]:w-auto", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
