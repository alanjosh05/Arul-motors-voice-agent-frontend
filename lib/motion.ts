"use client";

// anime.js (animejs.com), loaded on first use so it stays out of the main
// bundle. Everything that animates also respects the device's "reduce motion"
// setting.
import { type DependencyList, type RefObject, useEffect } from "react";

export type Anime = typeof import("animejs");

let loading: Promise<Anime> | null = null;

export function loadAnime(): Promise<Anime> {
  loading ??= import("animejs").catch((e) => {
    loading = null; // try again next time (e.g. the network was down)
    throw e;
  });
  return loading;
}

export const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Run `setup` with anime.js on the element in `ref` whenever `deps` change
 * (and on mount). Animations are scoped to the element and undone when deps
 * change or it unmounts. Nothing runs for "reduce motion" users, so `setup`
 * must only add movement, never content. It may return a cleanup.
 */
export function useAnime<T extends HTMLElement>(
  ref: RefObject<T | null>,
  setup: (anime: Anime, el: T) => void | (() => void),
  deps: DependencyList,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion()) return;
    let cancelled = false;
    let scope: { revert(): void } | undefined;
    loadAnime()
      .then((anime) => {
        if (cancelled || !el.isConnected) return;
        scope = anime.createScope({ root: el }).add(() => setup(anime, el));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      scope?.revert();
    };
    // `deps` is the caller's list; `setup` is read fresh each time they change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** A quick "pop" for something that just changed (a badge, a count). */
export function pop({ animate }: Anime, target: Element) {
  animate(target, { scale: [0.4, 1], opacity: [0, 1], ease: "outBack", duration: 450 });
}
