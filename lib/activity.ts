// What the CRM is doing with the server right now (adding, saving, deleting,
// uploading, opening a file), for the loader in the centre of the screen
// (components/action-loader.tsx). lib/api.ts reports every write here; reads
// are tracked from TanStack Query instead.
import { useSyncExternalStore } from "react";

const running = new Map<number, string>(); // request id -> what it's doing
const listeners = new Set<() => void>();
let nextId = 0;
let current: string | null = null;

function update() {
  // The most recent action still running is the one shown.
  current = running.size ? [...running.values()].at(-1)! : null;
  listeners.forEach((l) => l());
}

/** Report `run` as an action (`label`, e.g. "Saving the customer…") while it runs. */
export async function track<T>(label: string, run: () => Promise<T>): Promise<T> {
  const id = nextId++;
  running.set(id, label);
  update();
  try {
    return await run();
  } finally {
    running.delete(id);
    update();
  }
}

/** The action running now (its label), or null. */
export function useActivity(): string | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange);
      return () => listeners.delete(onChange);
    },
    () => current,
    () => null,
  );
}

// What a request is about, from its path (first match wins).
const SUBJECTS: [RegExp, string][] = [
  [/^\/api\/job-card\/extract/, "Reading the job card…"],
  [/^\/api\/appointments\/\d+\/close/, "Closing the service…"],
  [/^\/api\/vehicles\/\d+\/services/, "Recording the service…"],
  [/^\/api\/appointments\/\d+\/cancel/, "Cancelling the booking…"],
  [/^\/api\/service-types\/\d+\/move/, "Reordering…"],
  [/^\/api\/auth\/password/, "Changing the password…"],
  [/^\/api\/auth\/login/, "Signing in…"],
  [/^\/api\/calls\/log/, "Logging the call…"],
];
const NOUNS: [RegExp, string][] = [
  [/^\/api\/appointments/, "booking"],
  [/^\/api\/customers/, "customer"],
  [/^\/api\/vehicles/, "bike"],
  [/^\/api\/bike-models/, "bike model"],
  [/^\/api\/calls/, "call"],
  [/^\/api\/service-records/, "service"],
  [/^\/api\/service-types/, "service type"],
  [/^\/api\/staff/, "team member"],
  [/^\/api\/showroom-staff/, "staff member"],
  [/^\/api\/staff-categories/, "category"],
  [/^\/api\/settings/, "settings"],
];

/** A short label for a write request, e.g. "Deleting the bike…". */
export function describe(method: string, path: string): string {
  const special = SUBJECTS.find(([re]) => re.test(path));
  if (special) return special[1];
  const noun = NOUNS.find(([re]) => re.test(path))?.[1];
  const the = noun ? ` the ${noun}` : "";
  if (method === "DELETE") return `Deleting${the}…`;
  if (method === "POST") return noun ? `Adding the ${noun}…` : "Saving…";
  return `Saving${the}…`;
}
