"use client";

// anime.js (animejs.com), loaded on first use so it stays out of the main
// bundle. Everything that animates also respects the device's "reduce motion"
// setting.
type Anime = typeof import("animejs");

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
