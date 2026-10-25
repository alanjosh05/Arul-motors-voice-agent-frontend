"use client";

// Sign out after 15 minutes without use (React Haiku's useIdle): after 14
// minutes a "Still there?" warning counts down the last minute. Activity in
// any open CRM tab counts (shared through localStorage), and a voice call in
// progress keeps the session open.
import { Clock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIdle } from "react-haiku";
import { useAuth } from "@/components/auth-provider";
import { useCall } from "@/components/call/call-provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const IDLE_MS = 15 * 60_000;
const WARN_MS = 60_000; // the warning shows for the last minute
const ACTIVE_KEY = "am-crm.last-active";
// Constant arrays: listeners are registered once. React Haiku accepts these
// five; keydown/wheel/touchstart also count, through the shared timestamp.
const IDLE_EVENTS: ("mousemove" | "scroll" | "touchmove" | "click" | "keypress")[] = ["mousemove", "scroll", "touchmove", "click", "keypress"];
const ACTIVITY = ["mousemove", "mousedown", "keydown", "wheel", "scroll", "touchstart", "touchmove", "click"];

const readShared = () => {
  try {
    return Number(localStorage.getItem(ACTIVE_KEY)) || 0;
  } catch {
    return 0;
  }
};
const writeShared = (at: number) => {
  try {
    localStorage.setItem(ACTIVE_KEY, String(at));
  } catch {
    /* storage blocked: this tab only */
  }
};

export function IdleLogout() {
  const { logout } = useAuth();
  const { target: inCall } = useCall();
  const idle = useIdle(IDLE_MS - WARN_MS, { events: IDLE_EVENTS, initialState: false });
  /** When this tab signs out (set once the warning shows). */
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const deadlineRef = useRef<number | null>(null);
  const setDue = useCallback((at: number | null) => {
    deadlineRef.current = at;
    setDeadline(at);
  }, []);

  // useIdle only starts counting at the first event: start it now.
  const nudge = useCallback(() => document.dispatchEvent(new Event("mousemove")), []);
  useEffect(() => {
    nudge();
  }, [nudge]);

  // Any activity cancels the warning, and is shared (at most every 15 s) so
  // other open tabs don't sign out.
  useEffect(() => {
    let last = 0;
    const mark = () => {
      setDue(null);
      const t = Date.now();
      if (t - last > 15_000) {
        last = t;
        writeShared(t);
      }
    };
    writeShared(Date.now());
    ACTIVITY.forEach((e) => document.addEventListener(e, mark, { passive: true }));
    return () => ACTIVITY.forEach((e) => document.removeEventListener(e, mark));
  }, [setDue]);

  // Idle here (and no call on): each second, warn unless another tab was used
  // recently; sign out when the minute is up.
  useEffect(() => {
    if (!idle || inCall) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t - readShared() < IDLE_MS - WARN_MS) return setDue(null);
      const due = deadlineRef.current;
      if (due == null) setDue(t + WARN_MS);
      else if (t >= due) logout();
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [idle, inCall, logout, setDue]);

  // Back from sleep or another app after more than 15 minutes: sign out now.
  useEffect(() => {
    const check = () => {
      if (document.visibilityState === "visible" && !inCall && Date.now() - readShared() > IDLE_MS) logout();
    };
    document.addEventListener("visibilitychange", check);
    return () => document.removeEventListener("visibilitychange", check);
  }, [inCall, logout]);

  const warning = idle && !inCall && deadline != null;
  const left = deadline != null ? Math.max(0, Math.ceil((deadline - now) / 1000)) : 0;

  return (
    <AlertDialog open={warning}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="size-5" /> Still there?
          </AlertDialogTitle>
          <AlertDialogDescription>
            The CRM hasn&rsquo;t been used for 14 minutes. For safety you&rsquo;ll be signed out in{" "}
            <span className="tabular font-semibold text-foreground">{left} s</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={logout}>Sign out now</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              writeShared(Date.now());
              setDue(null);
              nudge();
            }}
          >
            Stay signed in
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
