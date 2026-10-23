"use client";

// Unsaved form drafts, so a form closed by accident (click outside, Escape, ×)
// opens again with what was typed. Kept in this browser for a day, removed when
// the form is saved or discarded, and all removed at sign-out (they can hold
// customers' names and numbers).
import { useEffect, useMemo, useState } from "react";

const PREFIX = "am-crm.draft.";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Values = Record<string, unknown>;

function readDraft(key: string): Values | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { at, values } = JSON.parse(raw) as { at: number; values: Values };
    if (Date.now() - at > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return values;
  } catch {
    return null;
  }
}

function writeDraft(key: string, values: Values) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), values }));
  } catch {
    /* storage full or blocked: the form just won't be restored */
  }
}

function removeDraft(key: string) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

/** Remove every saved draft (at sign-out). */
export function clearAllDrafts() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

export interface FormDraft {
  /** True when this form opened with a saved draft. */
  restored: boolean;
  /** A field's saved value, or `fallback` when the draft doesn't have it. */
  get<T>(field: string, fallback: T): T;
  /** Forget the draft (after saving, or "Discard draft"). */
  clear(): void;
}

/** The saved draft for one form (`key` names the form and the record, e.g.
 * "customer:12"). Read once, when the form opens. */
export function useFormDraft(key: string): FormDraft {
  const [saved] = useState(() => readDraft(key));
  return useMemo(
    () => ({
      restored: saved !== null,
      get: <T,>(field: string, fallback: T) => (saved && field in saved ? (saved[field] as T) : fallback),
      clear: () => removeDraft(key),
    }),
    [saved, key],
  );
}

/** Save the form's current values as its draft once they differ from what the
 * form opened with (so opening and closing a form leaves nothing behind). */
export function useAutosaveDraft(key: string, values: Values) {
  const json = JSON.stringify(values);
  const [opened] = useState(json);
  useEffect(() => {
    if (json !== opened) writeDraft(key, JSON.parse(json) as Values);
  }, [key, json, opened]);
}
