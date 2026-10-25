"use client";

import { CloudOff, Wifi, WifiLow, WifiOff, WifiZero } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type ConnectionQuality, useConnectionQuality } from "@/lib/use-connection-quality";
import { cn } from "@/lib/utils";

const LOOK: Record<ConnectionQuality, { label: string; icon: typeof Wifi; tone: string }> = {
  checking: { label: "Checking…", icon: Wifi, tone: "text-muted-foreground" },
  good: { label: "Good", icon: Wifi, tone: "text-success" },
  fair: { label: "Fair", icon: WifiLow, tone: "text-[color-mix(in_oklch,var(--warning),black_25%)] dark:text-warning" },
  slow: { label: "Slow", icon: WifiZero, tone: "text-destructive" },
  offline: { label: "Offline", icon: WifiOff, tone: "text-destructive" },
  unreachable: { label: "No server", icon: CloudOff, tone: "text-destructive" },
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular text-right font-medium">{children}</span>
    </div>
  );
}

/** A tiny live line graph of recent values. */
function Spark({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return <div className="h-8 rounded bg-muted/40" />;
  const max = Math.max(...values) || 1;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`).join(" ");
  return (
    <svg viewBox="0 0 100 32" preserveAspectRatio="none" className={cn("h-8 w-full", className)} aria-hidden>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Header pill: internet connection and how fast the CRM's server answers,
 * plus a banner while offline. Loaded client-only (see the hook). */
export default function NetworkStatus() {
  const [open, setOpen] = useState(false);
  const net = useConnectionQuality(open); // checks every 3 s while the panel is open
  const look = LOOK[net.quality];
  const Icon = look.icon;
  const down = net.quality === "offline" || net.quality === "unreachable";

  // Say so when the connection comes back (not on the first check).
  const wasDown = useRef(false);
  useEffect(() => {
    if (down) wasDown.current = true;
    else if (wasDown.current && net.quality !== "checking") {
      wasDown.current = false;
      toast.success("Back online", { description: "Data is refreshing and waiting changes are being sent." });
    }
  }, [down, net.quality]);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent"
          >
            <Icon className={cn("size-3.5", look.tone)} />
            <span className="hidden sm:inline">{look.label}</span>
            {net.latency != null && !down && <span className="tabular hidden lg:inline">· {net.latency} ms</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 space-y-3">
          <div className="flex items-center gap-2">
            <Icon className={cn("size-4", look.tone)} />
            <p className="font-medium">Connection: {look.label}</p>
            {open && !down && <span className="ml-auto inline-flex items-center gap-1 text-xs text-success"><span className="size-1.5 animate-pulse rounded-full bg-success" /> Live</span>}
          </div>
          <div className="divide-y">
            <Row label="Internet">{net.online ? "Online" : "Offline"}</Row>
            <Row label="Download speed">{net.mbps != null ? `${net.mbps} Mbps` : down ? "—" : "measuring…"}</Row>
            <Row label="Server reply">{net.quality === "unreachable" ? "Not reachable" : net.latency != null ? `${net.history[net.history.length - 1]} ms` : "checking…"}</Row>
            <Row label="Jitter">{net.jitter != null ? `± ${net.jitter} ms` : "—"}</Row>
            {net.networkType && <Row label="Network">{net.networkType.toUpperCase()}{net.saveData ? " · data saver" : ""}</Row>}
            <Row label="Last check">{net.checkedAt ? new Date(net.checkedAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "—"}</Row>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="space-y-1"><p>Mbps</p><Spark values={net.mbpsHistory} className="text-primary" /></div>
            <div className="space-y-1"><p>Reply ms</p><Spark values={net.history} className={look.tone} /></div>
          </div>
        </PopoverContent>
      </Popover>

      {down && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-medium text-white shadow-lg"
        >
          <Icon className="size-4 shrink-0" />
          {net.quality === "offline"
            ? "You're offline. Showing the last saved data; changes are sent when you're back online."
            : "Can't reach the Arul Motors server. Showing saved data; trying again every few seconds."}
        </div>
      )}
    </>
  );
}
