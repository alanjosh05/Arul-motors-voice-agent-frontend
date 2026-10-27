"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { API_URL } from "@/lib/api";
import { formatDay, OUTCOME_LABELS } from "@/lib/format";
import { getToken } from "@/lib/session";
import type { ActiveCall, LiveEntity, LiveMessage, LiveNotification } from "@/lib/types";

export type LiveStatus = "connecting" | "live" | "offline";

interface LiveContextValue {
  status: LiveStatus;
  activeCalls: ActiveCall[];
  notifications: LiveNotification[];
  unread: number;
  markAllRead: () => void;
}

const LiveContext = createContext<LiveContextValue | null>(null);

const SEEN_KEY = "am-crm.notifications.seen";
const PING_MS = 25_000;
const MAX_BACKOFF_MS = 15_000;

// React Query keys to refresh for each changed entity (see lib/queries.ts).
const ENTITY_KEYS: Record<LiveEntity, string[]> = {
  customers: ["customers", "customer"],
  vehicles: ["vehicles", "customer", "bike-models"],
  appointments: ["appointments", "customer"],
  calls: ["calls", "customer"],
  due: ["due"],
  stats: ["stats"],
  service_types: ["service-types"],
  showroom_staff: ["showroom-staff"],
  staff_categories: ["staff-categories", "showroom-staff"],
  bike_models: ["bike-models", "vehicles"],
  settings: ["settings", "voice-status"],
  service_records: ["service-history", "customer"],
};

const callKey = (c: ActiveCall) => c.call_id ?? c.id;

function readSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Real-time CRM: a WebSocket to the API (on the GCP backend) streams data
 * changes, calls in progress and notifications. The CRM itself is static
 * files, so the browser connects to the backend directly. */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>("connecting");
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [notifications, setNotifications] = useState<LiveNotification[]>([]);
  // Notifications only arrive over the socket, after hydration, so reading
  // localStorage here can't change the first render.
  const [seen, setSeen] = useState(readSeen);
  const pending = useRef(new Set<string>());
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const myName = user?.full_name || user?.username;

  // Batch refreshes: one burst of events → one refetch per query.
  const invalidate = useCallback(
    (entities: LiveEntity[]) => {
      entities.forEach((e) => ENTITY_KEYS[e]?.forEach((k) => pending.current.add(k)));
      if (flushTimer.current) return;
      flushTimer.current = setTimeout(() => {
        const keys = [...pending.current];
        pending.current.clear();
        flushTimer.current = null;
        keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
      }, 250);
    },
    [queryClient],
  );

  useEffect(() => {
    if (!user) return;
    let socket: WebSocket | null = null;
    let closedByUs = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let connectedBefore = false;
    let ping: ReturnType<typeof setInterval> | null = null;

    const onMessage = (message: LiveMessage) => {
      switch (message.type) {
        case "hello":
          setActiveCalls(message.data.active_calls);
          setNotifications(message.data.notifications);
          // A reconnect may have missed changes: refresh everything once. (Not on
          // the first connect: the page has only just loaded its data.)
          if (connectedBefore) invalidate(["customers", "vehicles", "appointments", "calls", "due", "stats"]);
          connectedBefore = true;
          break;
        case "data.changed":
          invalidate(message.data.entities);
          break;
        case "call.started":
          setActiveCalls((calls) => [...calls.filter((c) => callKey(c) !== message.data.call_id), message.data]);
          if (message.data.started_by !== myName) {
            toast.info(`Agent is calling ${message.data.customer_name}`, {
              description: message.data.started_by ? `Started by ${message.data.started_by}` : undefined,
            });
          }
          break;
        case "call.ended": {
          const d = message.data;
          setActiveCalls((calls) => calls.filter((c) => callKey(c) !== d.call_id));
          const outcome = d.outcome ? OUTCOME_LABELS[d.outcome] : "No outcome";
          const mins = `${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, "0")}`;
          const visit = d.service_date ? ` · coming ${formatDay(d.service_date)}${d.service_type ? ` for ${d.service_type}` : ""}` : "";
          toast(`Call with ${d.customer_name} ended`, { description: `${outcome}${visit} · ${mins}` });
          invalidate(["calls", "customers", "appointments", "stats"]);
          break;
        }
        case "notification":
          setNotifications((list) => [message, ...list.filter((n) => n.id !== message.id)].slice(0, 50));
          {
            const show = { success: toast.success, warning: toast.warning, error: toast.error, info: toast.info }[
              message.data.level
            ] ?? toast;
            show(message.data.title, { description: message.data.body || undefined });
          }
          break;
      }
    };

    const connect = () => {
      const token = getToken();
      if (!token) return;
      setStatus("connecting");
      socket = new WebSocket(`${API_URL.replace(/^http/, "ws")}/api/ws?token=${encodeURIComponent(token)}`);
      socket.onopen = () => {
        attempt = 0;
        setStatus("live");
        ping = setInterval(() => socket?.readyState === WebSocket.OPEN && socket.send("ping"), PING_MS);
      };
      socket.onmessage = (e) => {
        try {
          onMessage(JSON.parse(e.data) as LiveMessage);
        } catch {
          /* ignore malformed messages */
        }
      };
      socket.onclose = (e) => {
        if (ping) clearInterval(ping);
        if (closedByUs) return;
        setStatus("offline");
        if (e.code === 4401) return; // session expired: API calls will send the user to sign-in
        const delay = Math.min(1000 * 2 ** attempt++, MAX_BACKOFF_MS);
        retry = setTimeout(connect, delay);
      };
    };

    connect();
    // Reconnect right away when the tab comes back or the network returns.
    const wake = () => {
      if (document.visibilityState === "visible" && socket?.readyState === WebSocket.CLOSED) {
        if (retry) clearTimeout(retry);
        attempt = 0;
        connect();
      }
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      closedByUs = true;
      if (retry) clearTimeout(retry);
      if (ping) clearInterval(ping);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      socket?.close();
    };
  }, [user, myName, invalidate]);

  const markAllRead = useCallback(() => {
    const top = notifications[0]?.id ?? 0;
    setSeen(top);
    try {
      localStorage.setItem(SEEN_KEY, String(top));
    } catch {
      /* ignore */
    }
  }, [notifications]);

  const value = useMemo(
    () => ({
      status,
      activeCalls,
      notifications,
      unread: notifications.filter((n) => n.id > seen).length,
      markAllRead,
    }),
    [status, activeCalls, notifications, seen, markAllRead],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

/** Live connection status without requiring the provider (e.g. in hooks
 * that are also used outside the signed-in shell). */
export function useLiveStatus(): LiveStatus {
  return useContext(LiveContext)?.status ?? "offline";
}

export function useLive() {
  const context = useContext(LiveContext);
  if (!context) throw new Error("useLive must be used within LiveProvider");
  return context;
}
