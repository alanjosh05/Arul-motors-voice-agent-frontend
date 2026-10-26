import { Badge } from "@/components/ui/badge";
import { daysFromToday, OUTCOME_LABELS, relativeDay, STATE_LABELS } from "@/lib/format";
import { useOverdueDays } from "@/lib/queries";
import type { AppointmentState, CallOutcome } from "@/lib/types";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "red" | "gray" | "violet";

const TONES: Record<Tone, string> = {
  blue: "border-primary/20 bg-primary/8 text-primary",
  green: "border-success/25 bg-success/10 text-success",
  amber: "border-warning/30 bg-warning/12 text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning",
  red: "border-destructive/25 bg-destructive/8 text-destructive",
  gray: "border-border bg-muted text-muted-foreground",
  violet: "border-chart-5/30 bg-chart-5/10 text-chart-5",
};

export function ToneBadge({ tone, dot = true, className, children }: { tone: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", TONES[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </Badge>
  );
}

const STATE_TONES: Record<AppointmentState, Tone> = {
  upcoming: "blue",
  completed: "green",
  cancelled: "gray",
  missed: "red",
};

export function AppointmentStateBadge({ state }: { state?: AppointmentState }) {
  if (!state) return null;
  return <ToneBadge tone={STATE_TONES[state]}>{STATE_LABELS[state]}</ToneBadge>;
}

const OUTCOME_TONES: Record<CallOutcome, Tone> = {
  date_confirmed: "green",
  callback_requested: "amber",
  not_interested: "red",
  already_serviced: "violet",
  bike_sold: "gray",
  wrong_number: "gray",
  no_answer: "gray",
};

export function OutcomeBadge({ outcome }: { outcome: CallOutcome }) {
  return <ToneBadge tone={OUTCOME_TONES[outcome] ?? "gray"}>{OUTCOME_LABELS[outcome] ?? outcome}</ToneBadge>;
}

/** Service due date: overdue (red), within a week (amber), later (gray). */
/** Next service status. Before the due date: "In N days". After it, the
 * service type's overdue days are a grace period ("Due · N days left"); past
 * them it's "Overdue N days", counted from when it became overdue. */
/** The next service's date is set at the oil change (not called until then). */
export function OilChangeBadge() {
  return <ToneBadge tone="violet">After oil change</ToneBadge>;
}

export function DueBadge({ date, serviceType }: { date: string; serviceType?: string }) {
  const graceDays = useOverdueDays(serviceType);
  const n = daysFromToday(date);
  if (n >= 0) return <ToneBadge tone={n <= 7 ? "amber" : "gray"}>{relativeDay(date)}</ToneBadge>;
  const left = graceDays + n; // days until it becomes overdue
  if (left >= 0) {
    return <ToneBadge tone="amber">{left === 0 ? "Due · last day" : `Due · ${left} day${left === 1 ? "" : "s"} left`}</ToneBadge>;
  }
  return <ToneBadge tone="red">{`Overdue ${-left} day${left === -1 ? "" : "s"}`}</ToneBadge>;
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <ToneBadge tone={role === "admin" ? "blue" : "gray"} dot={false} className="capitalize">
      {role}
    </ToneBadge>
  );
}
