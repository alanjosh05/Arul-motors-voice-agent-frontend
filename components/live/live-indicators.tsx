"use client";

import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  CheckCheck,
  CircleAlert,
  Info,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  RotateCcw,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomerAvatar } from "@/components/customer-avatar";
import { useLive } from "@/components/live-provider";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { parseTimestamp, timeAgo } from "@/lib/format";
import type { ActiveCall, LiveNotification } from "@/lib/types";
import { cn } from "@/lib/utils";

/** "Live" when the WebSocket is connected. */
export function LiveStatus() {
  const { status } = useLive();
  const label = { live: "Live", connecting: "Connecting…", offline: "Reconnecting…" }[status];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground md:inline-flex">
          <span className="relative flex size-2">
            {status === "live" && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-50" />}
            <span className={cn("relative inline-flex size-2 rounded-full", status === "live" ? "bg-success" : status === "connecting" ? "bg-warning" : "bg-destructive")} />
          </span>
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {status === "live" ? "Updates arrive instantly from the server" : "Live updates paused; data still refreshes periodically"}
      </TooltipContent>
    </Tooltip>
  );
}

export function useElapsed(startedAt: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const secs = Math.max(0, Math.floor((now - parseTimestamp(startedAt).getTime()) / 1000));
  return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}

export function ActiveCallRow({ call }: { call: ActiveCall }) {
  const elapsed = useElapsed(call.started_at);
  return (
    <Link href={`/customers/view/?id=${call.customer_id}`} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted">
      <CustomerAvatar name={call.customer_name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{call.customer_name}</p>
        <p className="truncate text-xs text-muted-foreground">Started by {call.started_by ?? "—"}</p>
      </div>
      <span className="tabular rounded-md bg-success/12 px-2 py-0.5 font-mono text-xs font-medium text-success">{elapsed}</span>
    </Link>
  );
}

/** Header pill while the agent is on any call (any staff member's). */
export function ActiveCallsPill() {
  const { activeCalls } = useLive();
  if (!activeCalls.length) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-success/30 bg-success/8 text-success hover:bg-success/12 hover:text-success">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          <PhoneCall />
          <span className="hidden sm:inline">
            {activeCalls.length} live {activeCalls.length === 1 ? "call" : "calls"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <p className="px-2 pt-1 pb-2 text-xs font-medium text-muted-foreground">Agent on calls now</p>
        {activeCalls.map((c) => (
          <ActiveCallRow key={c.call_id ?? c.id} call={c} />
        ))}
      </PopoverContent>
    </Popover>
  );
}

const KIND_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  booking_created: CalendarCheck,
  booking_rescheduled: CalendarClock,
  booking_cancelled: CalendarX,
  booking_missed: CircleAlert,
  call_callback_requested: RotateCcw,
  call_no_answer: PhoneMissed,
  call_not_interested: PhoneOff,
};

const LEVEL_STYLES: Record<string, string> = {
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-[color-mix(in_oklch,var(--warning),black_30%)] dark:text-warning",
  error: "bg-destructive/10 text-destructive",
  info: "bg-primary/10 text-primary",
};

function NotificationItem({ n, unread }: { n: LiveNotification; unread: boolean }) {
  const Icon = KIND_ICONS[n.data.kind] ?? Info;
  const content = (
    <div className={cn("flex gap-3 rounded-lg p-2.5", n.data.customer_id && "hover:bg-muted")}>
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", LEVEL_STYLES[n.data.level] ?? LEVEL_STYLES.info)}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm leading-snug font-medium">{n.data.title}</p>
          {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
        </div>
        {n.data.body && <p className="text-xs leading-snug text-muted-foreground">{n.data.body}</p>}
        <p className="text-[11px] text-muted-foreground">{timeAgo(n.at)}</p>
      </div>
    </div>
  );
  return n.data.customer_id ? <Link href={`/customers/view/?id=${n.data.customer_id}`}>{content}</Link> : content;
}

/** The bell lists only unread notifications. What's shown when it opens stays
 * until it closes (or a notification is opened); after that they're read and
 * gone next time. "Mark all read" clears the list at once. New ones still
 * arrive while it's open. */
export function NotificationsBell() {
  const { notifications, unread, markAllRead } = useLive();
  const [open, setOpen] = useState(false);
  // Newest notification already read when the bell opened: anything newer is listed.
  const [seenAtOpen, setSeenAtOpen] = useState<number>(Infinity);
  const shown = notifications.filter((n) => n.id > seenAtOpen);
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setSeenAtOpen((notifications[unread] ?? { id: 0 }).id);
        else markAllRead();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-8" aria-label={`Notifications${unread ? ` (${unread} new)` : ""}`}>
          <Bell />
          {unread > 0 && (
            <span className="tabular absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-none font-semibold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => {
              markAllRead();
              setSeenAtOpen(notifications[0]?.id ?? 0); // empty the list now
            }}
            disabled={!shown.length}
          >
            <CheckCheck /> Mark all read
          </Button>
        </div>
        {shown.length ? (
          // Native scrolling: Radix ScrollArea doesn't scroll with only a max height.
          <div className="max-h-[min(26rem,calc(100svh-9rem))] overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            <div className="space-y-0.5 p-1.5" onClick={() => setOpen(false)}>
              {shown.map((n) => (
                <NotificationItem key={n.id} n={n} unread />
              ))}
            </div>
          </div>
        ) : (
          <Empty className="border-0 py-10">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Bell />
              </EmptyMedia>
              <EmptyTitle>You&rsquo;re all caught up</EmptyTitle>
              <EmptyDescription>New bookings and call outcomes from the voice agent show up here.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </PopoverContent>
    </Popover>
  );
}
