"use client";

// A Hairline figure (hairline/*.js, made with the /hairline-create skill): an
// isometric line drawing that answers the pointer. The engine and the figures
// load on demand, so pages that don't show one never pay for them. The drawing
// takes its colours from the theme (the engine reads `.dark` on <html>).
import { useEffect, useRef } from "react";
import type { FigureName } from "@/lib/hairline/figures";
import { cn } from "@/lib/utils";

/** `sweep`: no one is pointing (a loader), so an unseen pointer swings across
 *  the figure all the time, as the figure's own page does when you press play. */
export function HairlineFigure({ name, className, sweep = false }: { name: FigureName; className?: string; sweep?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = ref.current;
    if (!stage) return;
    let handle: { destroy: () => void } | undefined;
    let frame = 0;
    let gone = false;

    Promise.all([import("@/lib/hairline/kernel"), import("@/lib/hairline/figures")]).then(([{ HL }, { figureSources }]) => {
      if (gone) return;
      HL.inject(document);
      stage.setAttribute("data-hairline", name);
      const svg = HL.mk("svg", { viewBox: "0 0 400 320", "aria-hidden": "true" }, stage);
      let figure: { range: number[]; mount: (host: unknown, value: number) => { destroy: () => void } } | undefined;
      figureSources[name](HL, (f) => { figure = f; });
      if (!figure) return;
      // The read-out is for the figure's own page; here it goes nowhere.
      handle = figure.mount({ stage, svg, read: { textContent: "" } }, figure.range[1]);

      if (sweep && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const start = performance.now();
        const swing = (now: number) => {
          const r = stage.getBoundingClientRect();
          const x = 200 + 120 * Math.sin(((now - start) / 2200) * Math.PI * 2);
          stage.dispatchEvent(new PointerEvent("pointermove", {
            pointerType: "mouse", pointerId: 1, bubbles: true,
            clientX: r.left + (x / 400) * r.width, clientY: r.top + (170 / 320) * r.height,
          }));
          frame = requestAnimationFrame(swing);
        };
        frame = requestAnimationFrame(swing);
      }
    });

    return () => {
      gone = true;
      cancelAnimationFrame(frame);
      handle?.destroy();
    };
  }, [name, sweep]);

  return <div ref={ref} aria-hidden className={cn("h-32 w-auto", className)} />;
}
