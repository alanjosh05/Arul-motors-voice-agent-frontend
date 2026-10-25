"use client";

// Internet connectivity (React Haiku's useNetwork) and connection speed for
// the header indicator. Speed is measured the light way: how long the CRM's
// own API takes to answer a tiny request (every 3 s while the details panel is
// open, every 10 s otherwise, only while the tab is visible), plus the
// browser's own bandwidth estimate where it has one. No download speed tests:
// they'd use the showroom's mobile data and slow the CRM.
//
// Client-only: React Haiku reads `navigator` as it renders, which doesn't
// exist while pages are pre-built, so the indicator is loaded with ssr: false.
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useNetwork } from "react-haiku";
import { API_URL } from "./api";

const PING_MS = 10_000; // in the background
const LIVE_PING_MS = 3_000; // while the details panel is open
const SMOOTH = 3; // the headline is the median of the last few replies
const HISTORY = 20; // kept for the live graph and min/avg/max
// Download speed: a 256 KB file from the CRM's own host, fetched only while the
// details panel is open (about 5 MB a minute), never in the background.
const SPEED_FILE = "/speedtest.bin";

/** Network Information API (Chrome, Edge, Android; not Safari/Firefox). */
interface NetworkInformation extends EventTarget {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number; // Mbps, the browser's estimate (Chrome caps it at 10)
  rtt?: number;
  saveData?: boolean;
}

const connection = () =>
  typeof navigator === "undefined" ? undefined : (navigator as Navigator & { connection?: NetworkInformation }).connection;

function subscribe(onChange: () => void) {
  const c = connection();
  c?.addEventListener("change", onChange);
  return () => c?.removeEventListener("change", onChange);
}

// A string snapshot, so useSyncExternalStore sees "no change" between reads.
const snapshot = () => {
  const c = connection();
  return c ? JSON.stringify({ type: c.effectiveType, downlink: c.downlink, saveData: c.saveData }) : "";
};

export type ConnectionQuality = "checking" | "good" | "fair" | "slow" | "offline" | "unreachable";

export interface ConnectionState {
  quality: ConnectionQuality;
  online: boolean;
  /** Milliseconds for the API to answer (median of the last few checks). */
  latency: number | null;
  /** Recent replies, oldest first (for the graph). */
  history: number[];
  /** Typical change between consecutive replies (ms). */
  jitter: number | null;
  /** When the last check finished (ms since epoch). */
  checkedAt: number | null;
  /** Measured download speed in Mbps (only while the panel is open). */
  mbps: number | null;
  mbpsHistory: number[];
  /** Browser's bandwidth estimate in Mbps, if it gives one. */
  downlink: number | null;
  networkType: string | null;
  saveData: boolean;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** `live`: check every few seconds (the details panel is open). */
export function useConnectionQuality(live = false): ConnectionState {
  const haikuOnline = useNetwork();
  const info = useSyncExternalStore(subscribe, snapshot, () => "");
  const [samples, setSamples] = useState<number[]>([]);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [speeds, setSpeeds] = useState<number[]>([]);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const started = performance.now();
      try {
        const response = await fetch(`${API_URL}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(String(response.status));
        const ms = Math.round(performance.now() - started);
        if (stopped) return;
        setSamples((s) => [...s, ms].slice(-HISTORY));
        setReachable(true);
        setCheckedAt(Date.now());
      } catch {
        if (stopped) return;
        setReachable(false);
        setCheckedAt(Date.now());
      }
    };
    const measure = async () => {
      if (!live || document.visibilityState !== "visible") return;
      const started = performance.now();
      try {
        const response = await fetch(`${SPEED_FILE}?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        const bytes = (await response.arrayBuffer()).byteLength;
        const seconds = (performance.now() - started) / 1000;
        if (stopped || !response.ok || !bytes) return;
        setSpeeds((s) => [...s, Math.round(((bytes * 8) / seconds / 1e6) * 10) / 10].slice(-HISTORY));
      } catch {
        /* the reply check above reports a dead connection */
      }
    };
    const ping = async () => {
      await check();
      await measure();
    };
    void ping();
    const timer = setInterval(() => void ping(), live ? LIVE_PING_MS : PING_MS);
    const wake = () => void ping(); // check straight away when the network or tab comes back
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      clearInterval(timer);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [live]);

  return useMemo(() => {
    const net = info ? (JSON.parse(info) as { type?: string; downlink?: number; saveData?: boolean }) : {};
    const latency = median(samples.slice(-SMOOTH));
    const gaps = samples.slice(1).map((ms, i) => Math.abs(ms - samples[i]));
    const jitter = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    // React Haiku starts at "online" even when the page opens offline, so a
    // failed check of the API also counts as offline until one succeeds.
    const online = haikuOnline && reachable !== false;
    let quality: ConnectionQuality;
    if (!haikuOnline) quality = "offline";
    else if (reachable === false) quality = "unreachable";
    else if (latency == null) quality = "checking";
    else if (net.type === "slow-2g" || net.type === "2g" || latency > 1000) quality = "slow";
    else if (latency > 400) quality = "fair";
    else quality = "good";
    return {
      quality,
      online,
      latency,
      history: samples,
      mbps: speeds.length ? speeds[speeds.length - 1] : null,
      mbpsHistory: speeds,
      jitter,
      checkedAt,
      downlink: net.downlink ?? null,
      networkType: net.type ?? null,
      saveData: !!net.saveData,
    };
  }, [haikuOnline, reachable, samples, info, checkedAt, speeds]);
}
