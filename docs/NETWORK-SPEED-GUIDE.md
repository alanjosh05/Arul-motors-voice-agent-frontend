# Internet connection and speed indicator: complete guide

How the Arul Motors CRM shows a live internet status, server reply time,
jitter and download speed (Mbps) in its top bar, and how to build the same in
another React app.

- **Built for:** Next.js 16 (static export), React 19, Tailwind, shadcn/ui, lucide-react, sonner.
- **What it needs:** React 18+ and a `fetch`-able backend. Everything else is optional.
- **In this repo:**
  - `lib/use-connection-quality.ts`: the hook (all measuring)
  - `components/network/network-status.tsx`: the pill, details panel, offline banner and toast
  - `public/speedtest.bin`: the 256 KB file used for the Mbps test
  - `components/layout/site-header.tsx`: where it's mounted (client-only)
  - Backend: `GET /api/health` (public, tiny JSON) in `Arul-Motors/api.py`

---

## 1. What the user sees

**Top-bar pill:** a Wi-Fi icon coloured by quality, a label, and the reply time
(for example `Good · 45 ms`). The label is hidden on phones and the reply time
on smaller screens.

**Details panel** (click the pill). It measures every 3 seconds while open:

| Row | Meaning |
|---|---|
| Internet | Online / Offline |
| Download speed | Measured Mbps (latest test) |
| Server reply | Latest round-trip to your API, in ms |
| Jitter | Average change between consecutive replies (± ms) |
| Network | Browser's network class (4G/3G/2G) and "data saver", where supported |
| Last check | Time of the last check |
| Two sparklines | Last 20 Mbps results and last 20 reply times |

A green pulsing **Live** dot shows while it's updating.

**When the connection drops:**
- A red banner is fixed to the bottom of the screen. It says either "You're
  offline" (no internet) or "Can't reach the server" (internet works, but the
  API doesn't answer).
- When the connection comes back, a **"Back online"** toast shows.

**Quality levels:**

| Quality | Rule (checked in this order) | Icon |
|---|---|---|
| `offline` | Browser reports no network | WifiOff |
| `unreachable` | Online, but the last API check failed | CloudOff |
| `checking` | No successful check yet | Wifi (grey) |
| `slow` | Network is `2g`/`slow-2g`, or reply over 1000 ms | WifiZero (red) |
| `fair` | Reply over 400 ms | WifiLow (amber) |
| `good` | Otherwise | Wifi (green) |

The reply time used for quality is the **median of the last 3 checks**, so one
slow request doesn't flip the colour.

---

## 2. How it measures (and why this way)

There are four signals. They're combined because none of them is reliable on its own.

### 2.1 Online/offline: React Haiku `useNetwork()`

This wraps `navigator.onLine` plus the `online`/`offline` events.

- It only knows whether the device has *a* network, not whether the internet
  or your server works. Wi-Fi with no internet still counts as "online".
- React Haiku starts at "online" even when the page opens offline.
- So it is combined with 2.2: **online = `useNetwork()` and the last API check
  didn't fail.**

### 2.2 Server reply time: ping your own API

```ts
const started = performance.now();
const res = await fetch(`${API_URL}/api/health`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
const ms = Math.round(performance.now() - started);
```

Why your own `/api/health`, not a third-party server?
- It measures what users actually feel: the path from their browser to *your* backend.
- It needs no CORS setup, no API keys, and no third-party privacy concerns.
- The endpoint must be **public** (no login), **tiny** (a few bytes of JSON),
  **uncached** (`cache: "no-store"`) and **cheap** (no database query).

Check timing:

| When | Interval |
|---|---|
| Panel closed | Every **10 s** |
| Panel open | Every **3 s** |
| Tab hidden | Skipped (`document.visibilityState !== "visible"`) |
| Tab shown again, or `online` event | Immediately |

Up to the last 20 results are kept. The headline uses the median of the last 3;
the panel's "Server reply" row shows the latest value.

### 2.3 Jitter

```ts
const gaps = samples.slice(1).map((ms, i) => Math.abs(ms - samples[i]));
const jitter = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
```

This is the mean absolute difference between consecutive replies, a simple
version of the RFC 3550 idea. High jitter means an unstable connection even when
the average is fine. This matters for voice calls.

### 2.4 Download speed (Mbps): a 256 KB file from your own host

```ts
const res = await fetch(`/speedtest.bin?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
const bytes = (await res.arrayBuffer()).byteLength;
const seconds = (performance.now() - started) / 1000;
const mbps = Math.round(((bytes * 8) / seconds / 1e6) * 10) / 10; // 1 decimal
```

- **Only while the panel is open.** Each test downloads 256 KB, so every 3 s is
  about **5 MB per minute**. That's fine while someone is watching, but never in
  the background on mobile data.
- **Random bytes**, so gzip/brotli can't shrink the file and fake a high speed.
  Create it with `head -c 262144 /dev/urandom > public/speedtest.bin`.
- **The `?t=` timestamp and `no-store`** stop the browser and CDN from serving
  it from cache.
- **The same host as the frontend**, so it measures the user's link to your
  site. To measure the link to the API server instead, serve the file from the
  API (see §6).

### 2.5 Browser hints: Network Information API

`navigator.connection` gives `effectiveType` (`4g`/`3g`/`2g`/`slow-2g`),
`downlink` (Mbps estimate) and `saveData`.

- It exists in **Chrome, Edge and Android only**; Safari and Firefox don't have
  it, so it's treated as optional.
- Chrome **caps `downlink` at 10 Mbps** and rounds it for privacy, so it's
  useless as a speed test. That's why §2.4 exists.
- It's read with `useSyncExternalStore` on its `change` event. The snapshot is a
  **JSON string**, so React sees "no change" between identical reads; a new
  object each time would loop forever.

---

## 3. Gotchas we hit (read these before copying)

1. **Server-side rendering / static export.**
   - **Problem:** React Haiku reads `navigator` while rendering, which doesn't exist at build time.
   - **Fix:** load the component client-only:
     ```ts
     const NetworkStatus = dynamic(() => import("@/components/network/network-status"), { ssr: false });
     ```
2. **`useSyncExternalStore` snapshot must be stable.**
   - **Fix:** return a primitive (string), not a new object, or you get an infinite render loop.
3. **Hidden tabs.**
   - **Problem:** browsers throttle timers in background tabs, and measuring there wastes data.
   - **Fix:** skip checks while hidden and check again on `visibilitychange`.
4. **The first request is slower.**
   - **Problem:** DNS, TCP and TLS setup are counted on the first ping.
   - **Fix:** the median of 3 hides it.
5. **256 KB underestimates very fast links.**
   - **Problem:** on 100+ Mbps the transfer is so short that connection ramp-up (TCP slow start) dominates.
   - **Effect:** readings are accurate up to roughly 50–80 Mbps and lower than the truth above that.
   - **Fix:** if you need precision there, use 1–2 MB (more data per test) or time only the body (§6).
6. **Unmounted component.**
   - **Problem:** results can arrive after the component unmounts.
   - **Fix:** use a `stopped` flag set in the effect cleanup and ignore late results.
7. **Changing the interval.**
   - **Fix:** the effect depends on `live`, so opening or closing the panel restarts the timer at the new rate.
8. **Caching servers/CDNs.**
   - **Fix:** keep `no-store` on the request. Also don't give `/speedtest.bin`
     long-lived cache headers, though `?t=` already bypasses them.

---

## 4. Copy-paste implementation (generic version)

The same code as this repo, with the app-specific parts turned into options.

### 4.1 Install

```bash
npm i react-haiku          # useNetwork (optional, see note)
head -c 262144 /dev/urandom > public/speedtest.bin
```

Without React Haiku, replace `useNetwork()` with this:

```ts
const online = useSyncExternalStore(
  (cb) => { addEventListener("online", cb); addEventListener("offline", cb); return () => { removeEventListener("online", cb); removeEventListener("offline", cb); }; },
  () => navigator.onLine,
  () => true,
);
```

### 4.2 Backend health endpoint (any framework)

```python
# FastAPI
@app.get("/api/health")
def health():
    return {"status": "ok"}
```

```js
// Express
app.get("/api/health", (_req, res) => res.set("Cache-Control", "no-store").json({ status: "ok" }));
```

Keep it public, with no database access. If the frontend is on another
domain, allow it in CORS.

### 4.3 The hook: `useConnectionQuality.ts`

```ts
"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useNetwork } from "react-haiku";

export interface ConnectionOptions {
  healthUrl: string;          // e.g. `${API_URL}/api/health`
  speedFileUrl?: string;      // e.g. "/speedtest.bin" (omit to skip Mbps)
  backgroundMs?: number;      // default 10_000
  liveMs?: number;            // default 3_000
  fairMs?: number;            // default 400
  slowMs?: number;            // default 1000
}

export type ConnectionQuality = "checking" | "good" | "fair" | "slow" | "offline" | "unreachable";

interface NetworkInformation extends EventTarget {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
  saveData?: boolean;
}
const connection = () =>
  typeof navigator === "undefined" ? undefined : (navigator as Navigator & { connection?: NetworkInformation }).connection;
const subscribe = (cb: () => void) => {
  const c = connection();
  c?.addEventListener("change", cb);
  return () => c?.removeEventListener("change", cb);
};
const snapshot = () => {
  const c = connection();
  return c ? JSON.stringify({ type: c.effectiveType, downlink: c.downlink, saveData: c.saveData }) : "";
};

const HISTORY = 20;
const SMOOTH = 3;
const median = (v: number[]) => (v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : null);

export function useConnectionQuality(opts: ConnectionOptions, live = false) {
  const { healthUrl, speedFileUrl, backgroundMs = 10_000, liveMs = 3_000, fairMs = 400, slowMs = 1000 } = opts;
  const deviceOnline = useNetwork();
  const info = useSyncExternalStore(subscribe, snapshot, () => "");
  const [samples, setSamples] = useState<number[]>([]);
  const [speeds, setSpeeds] = useState<number[]>([]);
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);

  useEffect(() => {
    let stopped = false;
    const visible = () => document.visibilityState === "visible";

    const check = async () => {
      if (!visible()) return;
      const t0 = performance.now();
      try {
        const r = await fetch(healthUrl, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        if (!r.ok) throw new Error(String(r.status));
        if (stopped) return;
        setSamples((s) => [...s, Math.round(performance.now() - t0)].slice(-HISTORY));
        setReachable(true);
      } catch {
        if (stopped) return;
        setReachable(false);
      }
      setCheckedAt(Date.now());
    };

    const measure = async () => {
      if (!live || !speedFileUrl || !visible()) return;
      const t0 = performance.now();
      try {
        const r = await fetch(`${speedFileUrl}?t=${Date.now()}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
        const bytes = (await r.arrayBuffer()).byteLength;
        const secs = (performance.now() - t0) / 1000;
        if (stopped || !r.ok || !bytes) return;
        setSpeeds((s) => [...s, Math.round(((bytes * 8) / secs / 1e6) * 10) / 10].slice(-HISTORY));
      } catch {
        /* the health check reports a dead connection */
      }
    };

    const tick = async () => {
      await check();
      await measure(); // one after the other, so they don't compete for bandwidth
    };
    void tick();
    const timer = setInterval(() => void tick(), live ? liveMs : backgroundMs);
    const wake = () => void tick();
    addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      clearInterval(timer);
      removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [live, healthUrl, speedFileUrl, backgroundMs, liveMs]);

  return useMemo(() => {
    const net = info ? (JSON.parse(info) as { type?: string; downlink?: number; saveData?: boolean }) : {};
    const latency = median(samples.slice(-SMOOTH));
    const gaps = samples.slice(1).map((ms, i) => Math.abs(ms - samples[i]));
    const jitter = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    let quality: ConnectionQuality;
    if (!deviceOnline) quality = "offline";
    else if (reachable === false) quality = "unreachable";
    else if (latency == null) quality = "checking";
    else if (net.type === "slow-2g" || net.type === "2g" || latency > slowMs) quality = "slow";
    else if (latency > fairMs) quality = "fair";
    else quality = "good";
    return {
      quality,
      online: deviceOnline && reachable !== false,
      latency,                                   // median of last 3 (for the pill/colour)
      lastReply: samples.at(-1) ?? null,         // latest (for the panel)
      history: samples,
      jitter,
      mbps: speeds.at(-1) ?? null,
      mbpsHistory: speeds,
      checkedAt,
      networkType: net.type ?? null,
      browserDownlink: net.downlink ?? null,     // capped at 10 by Chrome; hint only
      saveData: !!net.saveData,
    };
  }, [deviceOnline, reachable, samples, speeds, info, checkedAt, fairMs, slowMs]);
}
```

### 4.4 The UI: pill, panel, banner, toast

Below is the shadcn/ui and Tailwind version. Swap in your own popover and toast
if you don't use shadcn.

```tsx
"use client";
import { CloudOff, Wifi, WifiLow, WifiOff, WifiZero } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type ConnectionQuality, useConnectionQuality } from "@/lib/useConnectionQuality";

const OPTS = { healthUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/health`, speedFileUrl: "/speedtest.bin" };

const LOOK: Record<ConnectionQuality, { label: string; icon: typeof Wifi; tone: string }> = {
  checking: { label: "Checking…", icon: Wifi, tone: "text-muted-foreground" },
  good: { label: "Good", icon: Wifi, tone: "text-green-600" },
  fair: { label: "Fair", icon: WifiLow, tone: "text-amber-600" },
  slow: { label: "Slow", icon: WifiZero, tone: "text-red-600" },
  offline: { label: "Offline", icon: WifiOff, tone: "text-red-600" },
  unreachable: { label: "No server", icon: CloudOff, tone: "text-red-600" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{children}</span>
    </div>
  );
}

function Spark({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className="h-8 rounded bg-muted/40" />;
  const max = Math.max(...values) || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={`h-8 w-full ${className ?? ""}`} aria-hidden>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function NetworkStatus() {
  const [open, setOpen] = useState(false);
  const net = useConnectionQuality(OPTS, open); // fast checks only while the panel is open
  const look = LOOK[net.quality];
  const Icon = look.icon;
  const down = net.quality === "offline" || net.quality === "unreachable";

  const wasDown = useRef(false);
  useEffect(() => {
    if (down) wasDown.current = true;
    else if (wasDown.current && net.quality !== "checking") {
      wasDown.current = false;
      toast.success("Back online");
    }
  }, [down, net.quality]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button type="button" className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
            <Icon className={`size-3.5 ${look.tone}`} />
            <span className="hidden sm:inline">{look.label}</span>
            {net.latency != null && !down && <span className="hidden tabular-nums lg:inline">· {net.latency} ms</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="flex items-center gap-2">
            <Icon className={`size-4 ${look.tone}`} />
            <p className="font-medium">Connection: {look.label}</p>
            {!down && (
              <span className="ml-auto inline-flex items-center gap-1 text-xs text-green-600">
                <span className="size-1.5 animate-pulse rounded-full bg-green-600" /> Live
              </span>
            )}
          </div>
          <div className="divide-y">
            <Row label="Internet">{net.online ? "Online" : "Offline"}</Row>
            <Row label="Download speed">{net.mbps != null ? `${net.mbps} Mbps` : down ? "—" : "measuring…"}</Row>
            <Row label="Server reply">{net.quality === "unreachable" ? "Not reachable" : net.lastReply != null ? `${net.lastReply} ms` : "checking…"}</Row>
            <Row label="Jitter">{net.jitter != null ? `± ${net.jitter} ms` : "—"}</Row>
            {net.networkType && <Row label="Network">{net.networkType.toUpperCase()}{net.saveData ? " · data saver" : ""}</Row>}
            <Row label="Last check">{net.checkedAt ? new Date(net.checkedAt).toLocaleTimeString() : "—"}</Row>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="space-y-1"><p>Mbps</p><Spark values={net.mbpsHistory} className="text-blue-600" /></div>
            <div className="space-y-1"><p>Reply ms</p><Spark values={net.history} className={look.tone} /></div>
          </div>
        </PopoverContent>
      </Popover>

      {down && (
        <div role="status" className="fixed inset-x-0 bottom-0 z-50 bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
          {net.quality === "offline" ? "You're offline. Changes will be sent when you're back online." : "Can't reach the server. Retrying…"}
        </div>
      )}
    </>
  );
}
```

### 4.5 Mount it client-only

```tsx
// Next.js
import dynamic from "next/dynamic";
const NetworkStatus = dynamic(() => import("@/components/network/network-status"), { ssr: false });
// …in the header: <NetworkStatus />
```

In Vite or Create React App (no SSR), import it normally.

---

## 5. Data and cost budget

| Activity | Data used |
|---|---|
| Background health check (every 10 s, a few hundred bytes with headers) | about 2–3 KB/min |
| Panel open: health check every 3 s | about 8 KB/min |
| Panel open: Mbps test (256 KB every 3 s) | **about 5 MB/min** |
| Tab hidden | 0 |

Server load is one tiny request per open tab every 10 s. That's negligible for
a small team; for thousands of users, raise `backgroundMs` to 30 s.

---

## 6. Variations and upgrades

- **Measure the API link's Mbps instead of the frontend host's.**
  Add an API route that returns 256 KB of random bytes with `Cache-Control: no-store`
  (generate them once at startup), then point `speedFileUrl` at it.
- **More accurate Mbps on fast links:**
  - time only the body: start the timer after `fetch()` resolves (headers received);
  - read `res.body.getReader()` and count bytes for a fixed 1–2 s window;
  - or use a 1–2 MB file.
- **Upload speed:** `POST` a 256 KB `Blob` of random bytes to an endpoint
  that discards it, and time it the same way.
- **Use `PerformanceResourceTiming`** for exact network time (excluding JS
  overhead): `performance.getEntriesByName(url).at(-1)` gives
  `responseEnd - requestStart`. A cross-origin API must send `Timing-Allow-Origin`.
- **Shared state across components:** put the hook in a React context provider
  so the pill and other widgets share one set of timers.
- **Pause other work while offline:** read `online` to stop polling, queue
  mutations, or show cached data (the CRM does this with TanStack Query's
  persisted cache).
- **Tests:** mock `fetch` and `performance.now`, and test the quality rules as a
  pure function (move the `useMemo` body out into `classify(samples, info, …)`).

---

## 7. Checklist for the new app

- [ ] `GET /api/health`: public, tiny, `no-store`, no database
- [ ] CORS allows the frontend's origin (if on another domain)
- [ ] `public/speedtest.bin` = 256 KB of **random** bytes (not compressible)
- [ ] Hook added; `healthUrl` / `speedFileUrl` set
- [ ] Component mounted **client-only** (SSR apps)
- [ ] Thresholds (`fairMs` 400, `slowMs` 1000) tuned to your users' real reply times
- [ ] Checked: DevTools → Network → throttling "Slow 4G" shows Fair/Slow; "Offline" shows the banner; going back online shows the toast
- [ ] Checked: the Mbps test runs only while the panel is open (Network tab: no `speedtest.bin` requests when closed)
