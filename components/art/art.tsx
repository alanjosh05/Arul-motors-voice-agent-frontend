"use client";

import { useRef } from "react";
import { type Anime, useAnime } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Animates parts of one illustration (see the art files). */
export type ArtMotion = (anime: Anime, parts: Element[]) => void;

const SVG_NS = "http://www.w3.org/2000/svg";
const SHAPES = "path, circle, rect, ellipse, g, polygon, line";

/** The illustration's shapes in document order, so a part is picked by its
 *  index (our own wrappers left out, so indexes stay the same). */
const shapesOf = (svg: Element) => [...svg.querySelectorAll(SHAPES)].filter((s) => !s.hasAttribute("data-w"));

/**
 * The element to animate for one part. unDraw shapes carry their position in
 * a `transform` attribute, which a CSS transform would replace, so each part
 * is moved inside a plain <g> and that is animated instead (turning around its
 * own centre unless told otherwise).
 */
export function part(shape: Element, origin = "center"): SVGGElement {
  const parent = shape.parentElement;
  if (parent?.hasAttribute("data-w")) return parent as unknown as SVGGElement;
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("data-w", "");
  g.style.transformBox = "fill-box";
  g.style.transformOrigin = origin;
  shape.before(g);
  g.append(shape);
  return g;
}

/** Several shapes moved as one (e.g. a person: body, arms, head, tools). The
 * shapes stay in their drawing order; if they aren't side by side in the
 * drawing, each gets its own wrapper instead (they then move alike). */
export function group(shapes: Element[]): Element[] {
  const parent = shapes[0]?.parentElement;
  const siblings = parent ? [...parent.children] : [];
  const first = siblings.indexOf(shapes[0]);
  const together = parent && shapes.every((sh, i) => sh.parentElement === parent && siblings[first + i] === sh);
  if (!together) return shapes.map((sh) => part(sh));
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("data-w", "");
  g.style.transformBox = "fill-box";
  g.style.transformOrigin = "center";
  shapes[0].before(g);
  g.append(...shapes);
  return [g];
}

/** A decorative illustration (an SVG string from this repo, never user data).
 *  It pops in, floats gently, and its `motion` brings it to life. */
export function Art({ svg, motion, className }: { svg: string; motion?: ArtMotion; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useAnime(
    ref,
    (anime, el) => {
      const { animate } = anime;
      animate(el, { opacity: [0, 1], scale: [0.85, 1], translateY: [10, 0], ease: "outBack", duration: 650 });
      animate(el, { translateY: [0, -6], ease: "inOutSine", duration: 2200, delay: 700, loop: true, alternate: true });
      const root = el.querySelector("svg");
      if (root && motion) motion(anime, shapesOf(root));
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
