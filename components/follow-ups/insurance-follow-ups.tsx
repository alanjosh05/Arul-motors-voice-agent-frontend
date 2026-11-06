"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, NotebookPen, Pencil, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CallButton } from "@/components/actions";
import { CustomerAvatar } from "@/components/customer-avatar";
import { DataTable, SortHeader } from "@/components/data-table";
import { LogCallDialog, VehicleDialog } from "@/components/forms/lazy";
import { RowAction } from "@/components/row-action";
import { OutcomeBadge, ToneBadge } from "@/components/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { daysFromToday, formatDay, formatMobile } from "@/lib/format";
import { INSURANCE_REMIND_DAYS, insuranceStatus, needsInsuranceReminder } from "@/lib/insurance";
import { useCalls, useVehicles, useVoiceEnabled } from "@/lib/queries";
import type { CallLog, Vehicle } from "@/lib/types";

type Row = Vehicle & { last_call?: CallLog };

const INSURANCE_OUTCOMES = new Set(["insurance_renewed", "insurance_reminded"]);

/** How far off (or past) the expiry is. */
function ExpiryBadge({ expiry }: { expiry: string }) {
  const n = daysFromToday(expiry);
  if (n < 0) return <ToneBadge tone="red">{`Expired ${-n} day${n === -1 ? "" : "s"} ago`}</ToneBadge>;
  return <ToneBadge tone="amber">{n === 0 ? "Expires today" : `Expires in ${n} day${n === 1 ? "" : "s"}`}</ToneBadge>;
}

function RowActions({ row }: { row: Row }) {
  const [dialog, setDialog] = useState<"log" | "edit" | null>(null);
  const customer = { id: row.customer_id, name: row.customer_name ?? "", mobile_number: row.mobile_number };
  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <CallButton
        customer={customer}
        purpose="insurance"
        subtitle={`${row.model} · insurance ${daysFromToday(row.insurance_expiry!) < 0 ? "expired" : "expires"} ${formatDay(row.insurance_expiry!)}`}
        label="Call"
      />
      <Button variant="outline" size="sm" onClick={() => setDialog("edit")}>
        <Pencil /> Renewed
      </Button>
      <RowAction label="Log a call" icon={NotebookPen} onClick={() => setDialog("log")} />
      <RowAction label="View customer" icon={ExternalLink} href={`/customers/view/?id=${row.customer_id}`} />
      {dialog === "edit" && <VehicleDialog open onOpenChange={(o) => !o && setDialog(null)} vehicle={row} />}
      {dialog === "log" && (
        <LogCallDialog open onOpenChange={(o) => !o && setDialog(null)} customer={{ id: row.customer_id, name: row.customer_name ?? "", vehicleId: row.id }} />
      )}
    </div>
  );
}

const columns: ColumnDef<Row>[] = [
  {
    accessorKey: "customer_name",
    header: ({ column }) => <SortHeader column={column} title="Customer" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CustomerAvatar name={row.original.customer_name ?? ""} />
        <div className="min-w-0">
          <Link href={`/customers/view/?id=${row.original.customer_id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
            {row.original.customer_name}
          </Link>
          <p className="text-xs text-muted-foreground">{formatMobile(row.original.mobile_number)}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "model",
    header: "Bike",
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="text-sm">{row.original.model}</p>
        <span className="plate">{row.original.registration_number}</span>
      </div>
    ),
  },
  {
    accessorKey: "insurance_provider",
    header: "Policy",
    cell: ({ row }) => (
      <div>
        <p className="text-sm">{row.original.insurance_provider || "—"}</p>
        {row.original.insurance_policy_no && <p className="font-mono text-xs text-muted-foreground">{row.original.insurance_policy_no}</p>}
      </div>
    ),
  },
  {
    accessorKey: "insurance_expiry",
    header: ({ column }) => <SortHeader column={column} title="Expires" />,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <span className="tabular text-sm">{formatDay(row.original.insurance_expiry!)}</span>
        <ExpiryBadge expiry={row.original.insurance_expiry!} />
      </div>
    ),
  },
  {
    id: "last_call",
    header: "Last reminder",
    cell: ({ row }) =>
      row.original.last_call ? (
        <div className="flex flex-col items-start gap-1">
          <OutcomeBadge outcome={row.original.last_call.outcome} />
          <span className="text-xs text-muted-foreground">{formatDay(row.original.last_call.created_at.slice(0, 10))}</span>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Not reminded yet</span>
      ),
  },
  { id: "actions", header: "", cell: ({ row }) => <RowActions row={row.original} /> },
];

/** Bikes whose insurance has expired or expires within 30 days: the reminder
 *  call queue (the agent calls about the insurance, not the service). */
export function InsuranceFollowUps() {
  const { data: bikes, isLoading } = useVehicles();
  const { data: calls } = useCalls();
  const voiceOn = useVoiceEnabled();
  const [filter, setFilter] = useState<"all" | "expired" | "soon">("all");

  const rows = useMemo<Row[]>(() => {
    // Each customer's latest insurance call (newest first in the log).
    const last = new Map<number, CallLog>();
    for (const c of calls ?? []) if (INSURANCE_OUTCOMES.has(c.outcome) && !last.has(c.customer_id)) last.set(c.customer_id, c);
    return (bikes ?? [])
      .filter((b) => needsInsuranceReminder(b.insurance_expiry))
      .filter((b) => filter === "all" || insuranceStatus(b.insurance_expiry) === filter)
      .map((b) => ({ ...b, last_call: last.get(b.customer_id) }));
  }, [bikes, calls, filter]);

  return (
    <div className="space-y-4">
      <Alert className="border-primary/20 bg-primary/5">
        <ShieldAlert className="text-primary" />
        <AlertTitle>Insurance reminders</AlertTitle>
        <AlertDescription>
          Bikes whose insurance has expired or expires within {INSURANCE_REMIND_DAYS} days.
          {voiceOn ? " The agent calls about the insurance, asks if it is renewed, and logs the outcome." : ""} Once a bike
          is renewed, press Renewed to enter the new expiry date: it leaves this list.
        </AlertDescription>
      </Alert>
      <DataTable
        columns={columns}
        data={isLoading ? undefined : rows}
        loading={isLoading}
        searchPlaceholder="Search name, bike, registration, company…"
        initialSorting={[{ id: "insurance_expiry", desc: false }]}
        emptyTitle="No insurance reminders"
        emptyDescription="No insurance has expired or expires soon."
        globalFilterFn={(r, q) => `${r.customer_name} ${r.mobile_number} ${r.model} ${r.registration_number} ${r.insurance_provider ?? ""}`.toLowerCase().includes(q)}
        toolbar={
          <ToggleGroup type="single" variant="outline" size="sm" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)}>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="expired">Expired</ToggleGroupItem>
            <ToggleGroupItem value="soon">Expiring soon</ToggleGroupItem>
          </ToggleGroup>
        }
      />
    </div>
  );
}
