"use client";

// A number that counts up to its value (anime.js), and counts on from the old
// value when it changes (e.g. a live update on the dashboard).
import { useEffect, useRef, useState } from "react";
import { loadAnime, reduceMotion } from "@/lib/motion";

const indian = new Intl.NumberFormat("en-IN");

export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let anim: { pause(): unknown } | undefined;
    loadAnime()
      .then(({ animate }) => {
        if (cancelled) return;
        const box = { n: from.current };
        anim = animate(box, {
          n: value,
          duration: reduceMotion() ? 0 : 1100,
          ease: "outExpo",
          onUpdate: () => {
            from.current = box.n;
            setShown(Math.round(box.n));
          },
          onComplete: () => {
            from.current = value;
            setShown(value);
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        from.current = value;
        setShown(value);
      });
    return () => {
      cancelled = true;
      anim?.pause();
    };
  }, [value]);

  return (
    <span aria-label={`${indian.format(value)}${suffix}`}>
      {indian.format(shown)}
      {suffix}
    </span>
  );
}
