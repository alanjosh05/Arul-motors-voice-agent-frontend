"use client";

import { useSyncExternalStore } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const PALETTE = [
  "bg-primary/12 text-primary",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/20 text-[color-mix(in_oklch,var(--chart-3),black_35%)] dark:text-chart-3",
  "bg-chart-4/12 text-chart-4",
  "bg-chart-5/15 text-chart-5",
];

// Soft backgrounds DiceBear picks from (per seed).
const BACKGROUNDS = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf", "c7f0db"];

// DiceBear (Avataaars, ~50 KB) loads after the page, once for every avatar on
// it; until then the initials show. Avatars are made in the browser (no
// network call, nothing sent anywhere) and kept, so lists don't rebuild SVGs.
type Make = (seed: string) => string;
let make: Make | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const cache = new Map<string, string>();

function load() {
  loading ??= Promise.all([import("@dicebear/core"), import("@dicebear/collection")])
    .then(([{ createAvatar }, { avataaars }]) => {
      make = (seed) => createAvatar(avataaars, { seed, backgroundColor: BACKGROUNDS, radius: 50 }).toDataUri();
      listeners.forEach((l) => l());
    })
    .catch(() => {
      loading = null; // initials stay; try again next time
    });
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  load();
  return () => listeners.delete(onChange);
}

/** A customer's DiceBear avatar, seeded by their name so it's the same
 * everywhere the CRM shows them (null until DiceBear has loaded). */
function useAvatarUri(name: string): string | null {
  const ready = useSyncExternalStore(subscribe, () => make !== null, () => false);
  if (!ready || !make) return null;
  const seed = name.trim().toLowerCase();
  let uri = cache.get(seed);
  if (!uri) {
    uri = make(seed);
    cache.set(seed, uri);
  }
  return uri;
}

export function CustomerAvatar({ name, className }: { name: string; className?: string }) {
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const uri = useAvatarUri(name);
  return (
    <Avatar className={cn("size-8", className)}>
      {uri && <AvatarImage src={uri} alt="" />}
      <AvatarFallback className={cn("text-xs font-semibold", PALETTE[hash % PALETTE.length])}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
