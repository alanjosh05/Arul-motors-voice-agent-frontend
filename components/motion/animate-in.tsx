"use client";

// Entrance animations with anime.js, played once when a page opens.
//
// Until anime.js has loaded, the elements to animate are hidden by CSS
// (`[data-anim-pending]` in globals.css), so they don't flash in and then jump.
// If it takes longer than REVEAL_MS (slow mobile data), the page simply shows
// without the animation.
import { useEffect, useRef } from "react";
import { loadAnime, reduceMotion } from "@/lib/motion";

type Anime = Awaited<ReturnType<typeof loadAnime>>;
type Preset = (anime: Anime, root: HTMLElement) => void | (() => void);

const REVEAL_MS = 800;

const PRESETS = {
  /** Cards rise into place one after another (the dashboard). */
  cards: ({ animate, stagger, utils }, root) => {
    const cards = root.querySelectorAll<HTMLElement>("[data-slot=card]");
    utils.set(cards, { opacity: 0 });
    animate(cards, {
      opacity: [0, 1],
      translateY: [22, 0],
      scale: [0.97, 1],
      duration: 750,
      ease: "outExpo",
      delay: stagger(55),
    });
  },

  /** Login: logo, then the bike pops in, the headline rises word by word, and
   *  the sign-in form slides up piece by piece. */
  login: ({ createTimeline, splitText, stagger, utils }, root) => {
    const q = (s: string) => [...root.querySelectorAll<HTMLElement>(s)];
    const headline = root.querySelector<HTMLElement>("[data-split]");
    const split = headline ? splitText(headline, { words: true }) : null;
    const words = (split?.words ?? []) as HTMLElement[];
    const logos = q("aside > img, main > img");
    const art = q("[data-anim=art]");
    const sub = q("[data-anim=sub]");
    const form = q("main > div > *");
    utils.set([...logos, ...art, ...words, ...sub, ...form], { opacity: 0 });

    createTimeline({ defaults: { ease: "outExpo", duration: 800 } })
      .add(logos, { opacity: [0, 1], translateY: [-14, 0] })
      .add(art, { opacity: [0, 1], scale: [0.8, 1], translateX: [-40, 0], ease: "outBack", duration: 1000 }, 150)
      .add(words, { opacity: [0, 1], translateY: [28, 0], rotate: [6, 0], delay: stagger(70) }, 350)
      .add(sub, { opacity: [0, 1], translateY: [14, 0] }, 750)
      .add(form, { opacity: [0, 1], translateY: [18, 0], delay: stagger(90) }, 200);
    return () => split?.revert();
  },

  /** 404: the picture drops in with a bounce, then keeps floating. */
  notFound: ({ animate, stagger, utils }, root) => {
    const art = root.querySelectorAll<HTMLElement>("[data-anim=art]");
    const text = root.querySelectorAll<HTMLElement>("[data-anim=text] > *, [data-anim=action]");
    utils.set([...art, ...text], { opacity: 0 });
    animate(art, { opacity: [0, 1], translateY: [-60, 0], ease: "outBounce", duration: 1100 });
    animate(text, { opacity: [0, 1], translateY: [16, 0], ease: "outExpo", duration: 700, delay: stagger(90, { start: 500 }) });
    animate(art, { translateY: [0, -10], ease: "inOutSine", duration: 1800, delay: 1200, loop: true, alternate: true });
  },
} satisfies Record<string, Preset>;

export function AnimateIn({
  preset,
  className,
  children,
}: {
  preset: keyof typeof PRESETS;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reveal = () => root.removeAttribute("data-anim-pending");
    if (reduceMotion()) return reveal();
    let cancelled = false;
    let scope: { revert(): void } | undefined;
    const giveUp = setTimeout(() => {
      cancelled = true;
      reveal();
    }, REVEAL_MS);
    loadAnime()
      .then((anime) => {
        if (cancelled) return;
        clearTimeout(giveUp);
        scope = anime.createScope({ root }).add(() => PRESETS[preset](anime, root));
        reveal();
      })
      .catch(reveal);
    return () => {
      cancelled = true;
      clearTimeout(giveUp);
      scope?.revert();
    };
  }, [preset]);

  return (
    <div ref={ref} data-anim-pending={preset} className={className}>
      {children}
    </div>
  );
}
