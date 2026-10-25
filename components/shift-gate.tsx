"use client";

import { Clock, LogOut, ShieldAlert } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { formatHour, type Shift, useShift } from "@/lib/shift";

const ACCEPT_KEY = "am-crm.after-hours"; // this out-of-hours period, accepted by an admin

const readAccepted = () => {
  try {
    return sessionStorage.getItem(ACCEPT_KEY);
  } catch {
    return null;
  }
};

/** When the shift next opens, in words: "7:00 AM today" / "7:00 AM tomorrow". */
function opensText(shift: Shift): string {
  const at = formatHour(shift.start);
  if (!shift.changesAt) return at;
  const opens = new Date(shift.changesAt);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(opens);
  return `${at} ${day === today ? "today" : "tomorrow"}`;
}

/** Outside working hours: staff see a closed screen; admins can continue after
 * accepting (until the shift next opens). The API enforces the same rule. */
export function ShiftGate({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const shift = useShift();
  const [accepted, setAccepted] = useState(readAccepted);
  const isAdmin = user?.role === "admin";
  // An acceptance counts for the out-of-hours period it was given in.
  const periodKey = shift.changesAt ?? `${shift.start}-${shift.end}`;
  const adminOk = isAdmin && accepted === periodKey;

  if (shift.open) return <>{children}</>;
  if (adminOk) {
    return (
      <>
        <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-warning/20 px-4 py-1.5 text-center text-xs font-medium">
          <ShieldAlert className="size-3.5" /> Out of shift hours · admin access. The CRM opens for staff at {opensText(shift)}.
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="grid min-h-svh place-items-center bg-muted/30 p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <Image src="/brand/logo-mark.svg" alt="Arul Motors" width={360} height={360} className="mx-auto size-14" unoptimized priority />
        <div className="space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Clock className="size-3.5" /> Out of shift hours
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">The CRM is closed now</h1>
          <p className="text-sm text-muted-foreground">
            Open every day {formatHour(shift.start)} – {formatHour(shift.end)}. It opens again at{" "}
            <span className="font-medium text-foreground">{opensText(shift)}</span>.
          </p>
        </div>
        {isAdmin ? (
          <div className="space-y-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-left text-sm">
            <p className="font-medium">Continue as admin?</p>
            <p className="text-muted-foreground">
              Staff can&rsquo;t use the CRM now. As an admin you can, but the server is switched off from {formatHour(shift.end)} to{" "}
              {formatHour(shift.start)} to save cost: if pages don&rsquo;t load, start the VM in Google Cloud first.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                try {
                  sessionStorage.setItem(ACCEPT_KEY, periodKey);
                } catch {
                  /* storage blocked: accepted for this page only */
                }
                setAccepted(periodKey);
              }}
            >
              <ShieldAlert /> I understand, continue as admin
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">See you then, {user?.full_name || user?.username}.</p>
        )}
        <Button variant="outline" onClick={logout}>
          <LogOut /> Sign out
        </Button>
      </div>
    </div>
  );
}

/** Sign-in page: say when only admins can sign in. (Client-only: the time of
 * day can't be known when the page is pre-built.) */
export function ShiftNotice() {
  const shift = useShift();
  if (shift.open) return null;
  return (
    <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
      <Clock className="mt-0.5 size-4 shrink-0" />
      <span>
        Out of shift hours: the CRM is open {formatHour(shift.start)} – {formatHour(shift.end)}. Only admins can sign in now.
      </span>
    </p>
  );
}
