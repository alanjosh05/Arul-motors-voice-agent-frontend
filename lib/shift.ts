"use client";

// Working hours. Outside them the CRM is closed to staff and admins accept a
// warning first; the API enforces the same rule (database.shift_info). The
// server's clock is used (via the public /api/health); if the server can't be
// reached (the VM is off at night), India time is worked out here instead.
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { API_URL } from "./api";

// Fallback when the server can't be reached; keep in step with SHIFT_START /
// SHIFT_END on the server and the VM's instance schedule.
const SHIFT_START = "07:00";
const SHIFT_END = "21:00";

export interface Shift {
  open: boolean;
  start: string; // "07:00"
  end: string; // "21:00"
  /** When it next closes (if open) or opens (if closed), ISO; null if unknown. */
  changesAt: string | null;
  fromServer: boolean;
}

const minutes = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};

/** Minutes past midnight in India now. */
function indiaMinutes(now = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** "07:00" -> "7:00 AM". */
export function formatHour(hm: string): string {
  const [h, m] = hm.split(":").map(Number);
  const hour = h % 24;
  return `${hour % 12 || 12}:${String(m).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

export function useShift(): Shift {
  const { data } = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const response = await fetch(`${API_URL}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!response.ok) throw new Error(String(response.status));
      return (await response.json()) as { shift?: { open: boolean; start: string; end: string; changes_at: string } };
    },
    refetchInterval: 60_000,
    retry: false,
    staleTime: 30_000,
  });
  // Re-check every minute, so the screen changes by itself at the boundaries.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const server = data?.shift;
  if (server) {
    // The server's answer, unless the boundary it named has passed since.
    const passed = server.changes_at && now >= new Date(server.changes_at).getTime();
    return { open: passed ? !server.open : server.open, start: server.start, end: server.end, changesAt: server.changes_at, fromServer: true };
  }
  const minute = indiaMinutes(new Date(now));
  return { open: minutes(SHIFT_START) <= minute && minute < minutes(SHIFT_END), start: SHIFT_START, end: SHIFT_END, changesAt: null, fromServer: false };
}
