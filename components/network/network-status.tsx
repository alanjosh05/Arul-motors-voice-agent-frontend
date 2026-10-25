"use client";

import { CloudOff, Wifi, WifiLow, WifiOff, WifiZero } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

/** Header pill: internet connection and how fast the CRM's server answers,
 * plus a banner while offline. Loaded client-only (see the hook). */
export default function NetworkStatus() {
  const net = useConnectionQuality();
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
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
            <Icon className={cn("size-3.5", look.tone)} />
            <span className="hidden sm:inline">{look.label}</span>
            {net.latency != null && !down && <span className="tabular hidden lg:inline">· {net.latency} ms</span>}
          </span>
        </TooltipTrigger>
        <TooltipContent className="space-y-0.5">
          <p className="font-medium">Internet: {net.online ? "online" : "offline"}</p>
          <p>
            Server reply:{" "}
            {net.quality === "unreachable" ? "not reachable" : net.latency != null ? `${net.latency} ms (typical of the last few checks)` : "checking…"}
          </p>
          <p>
            Bandwidth:{" "}
            {net.downlink != null ? `~${net.downlink >= 10 ? "10+" : net.downlink} Mbps (browser estimate)` : "not shown by this browser"}
          </p>
          {net.networkType && <p>Network: {net.networkType.toUpperCase()}{net.saveData ? " · data saver on" : ""}</p>}
          <p className="text-muted-foreground">Checked every 30 s while this tab is open.</p>
        </TooltipContent>
      </Tooltip>

      {down && (
        <div
          role="status"
          className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-center gap-2 bg-destructive px-4 py-2 text-center text-sm font-medium text-white shadow-lg"
        >
          <Icon className="size-4 shrink-0" />
          {net.quality === "offline"
            ? "You're offline. Showing the last saved data; changes are sent when you're back online."
            : "Can't reach the Arul Motors server. Showing saved data; trying again every 30 seconds."}
        </div>
      )}
    </>
  );
}
