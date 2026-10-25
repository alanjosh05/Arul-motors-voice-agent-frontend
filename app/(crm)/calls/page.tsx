"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarCheck, Ellipsis, ExternalLink, Headset, PhoneMissed, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomerAvatar } from "@/components/customer-avatar";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatTimestamp, OUTCOME_LABELS, timeAgo } from "@/lib/format";
import { CALL_LOG_LIMIT, useCallCount, useCalls, useDeleteCall, useDeleteCalls } from "@/lib/queries";
import type { CallLog, CallOutcome } from "@/lib/types";

/** ⋯ on a call (admins only): open the customer, delete the call. */
function CallRowActions({ call }: { call: CallLog }) {
  const { user } = useAuth();
  const remove = useDeleteCall();
  const [confirming, setConfirming] = useState(false);
  if (user?.role !== "admin") return null;
  return (
    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Call actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/customers/view/?id=${call.customer_id}`}>
              <ExternalLink /> Open customer
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            <Trash2 /> Delete call
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {confirming && (
        <ConfirmDialog
          open={confirming}
          onOpenChange={setConfirming}
          title="Delete this call?"
          description={`The ${OUTCOME_LABELS[call.outcome].toLowerCase()} call with ${call.customer_name} on ${formatTimestamp(call.created_at)} is removed from the call log for everyone.`}
          confirmLabel="Delete call"
          destructive
          onConfirm={() => remove.mutate(call.id)}
        />
      )}
    </div>
  );
}

const columns: ColumnDef<CallLog>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => <SortHeader column={column} title="When" />,
    cell: ({ row }) => (
      <div>
        <p className="tabular text-sm font-medium">{formatTimestamp(row.original.created_at)}</p>
        <p className="text-xs text-muted-foreground">{timeAgo(row.original.created_at)}</p>
      </div>
    ),
  },
  {
    accessorKey: "customer_name",
    header: ({ column }) => <SortHeader column={column} title="Customer" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CustomerAvatar name={row.original.customer_name ?? "?"} />
        <Link href={`/customers/view/?id=${row.original.customer_id}`} className="font-medium hover:underline">
          {row.original.customer_name}
        </Link>
      </div>
    ),
  },
  {
    accessorKey: "model",
    header: "Bike",
    cell: ({ row }) =>
      row.original.registration_number ? (
        <div className="space-y-1">
          <p className="text-sm">{row.original.model}</p>
          <span className="plate">{row.original.registration_number}</span>
        </div>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => <span className="line-clamp-2 max-w-72 text-sm text-muted-foreground">{row.original.notes ?? "—"}</span>,
  },
  { id: "actions", header: "", cell: ({ row }) => <CallRowActions call={row.original} /> },
];

export default function CallsPage() {
  const { data, isLoading } = useCalls();
  const { data: callCount } = useCallCount();
  const capped = !!callCount && callCount.total > CALL_LOG_LIMIT;
  const [outcome, setOutcome] = useState<CallOutcome | "all">("all");
  const rows = useMemo(() => (outcome === "all" ? data : data?.filter((c) => c.outcome === outcome)), [data, outcome]);
  const count = (o: CallOutcome) => data?.filter((c) => c.outcome === o).length ?? 0;
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const removeAll = useDeleteCalls();
  const [confirmAll, setConfirmAll] = useState(false);
  // "Delete all" follows the outcome filter: everything, or only that outcome.
  const toDelete = outcome === "all" ? (callCount?.total ?? data?.length ?? 0) : count(outcome);
  const allLabel = outcome === "all" ? "Delete all" : `Delete all ${OUTCOME_LABELS[outcome].toLowerCase()}`;

  return (
    <>
      <PageHeader
        title="Call log"
        description={
          capped
            ? `Latest ${CALL_LOG_LIMIT.toLocaleString("en-IN")} of ${callCount.total.toLocaleString("en-IN")} calls (agent and staff). Older calls are on each customer's profile.`
            : "Every follow-up call: made by the voice agent or logged by staff."
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total calls" icon={Headset} loading={isLoading} value={(callCount?.total ?? data?.length ?? 0).toLocaleString("en-IN")} hint="All time" />
        <StatCard label="Dates confirmed" icon={CalendarCheck} tone="success" loading={isLoading} value={count("date_confirmed")} hint={data?.length ? `${Math.round((100 * count("date_confirmed")) / data.length)}% of calls` : "—"} />
        <StatCard label="Call backs" icon={Repeat} tone="warning" loading={isLoading} value={count("callback_requested")} hint="Asked to call later" />
        <StatCard label="No answer" icon={PhoneMissed} tone="destructive" loading={isLoading} value={count("no_answer")} hint="Line dropped or unanswered" />
      </div>
      <DataTable
        columns={columns}
        data={rows}
        loading={isLoading}
        searchPlaceholder="Search customer, bike, notes…"
        initialSorting={[{ id: "created_at", desc: true }]}
        emptyTitle="No calls yet"
        emptyDescription="Start a call from Follow-ups or a customer's profile."
        globalFilterFn={(c, q) => `${c.customer_name} ${c.model ?? ""} ${c.registration_number ?? ""} ${c.notes ?? ""}`.toLowerCase().includes(q)}
        toolbar={
          <>
          <Select value={outcome} onValueChange={(v) => setOutcome(v as typeof outcome)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              {(Object.keys(OUTCOME_LABELS) as CallOutcome[]).map((o) => (
                <SelectItem key={o} value={o}>
                  {OUTCOME_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button variant="outline" className="text-destructive hover:text-destructive" disabled={!toDelete} onClick={() => setConfirmAll(true)}>
              <Trash2 /> {allLabel}
            </Button>
          )}
          </>
        }
      />
      {confirmAll && (
        <ConfirmDialog
          open={confirmAll}
          onOpenChange={setConfirmAll}
          title={outcome === "all" ? `Delete all ${toDelete.toLocaleString("en-IN")} calls?` : `Delete all ${OUTCOME_LABELS[outcome].toLowerCase()} calls?`}
          description={
            outcome === "all"
              ? "Every call in the call log is deleted for everyone, including older calls not listed here. The nightly backups keep a copy for 90 days."
              : `All ${OUTCOME_LABELS[outcome].toLowerCase()} calls are deleted for everyone${capped ? ", including older ones not listed here" : ` (${toDelete})`}. Other calls stay. The nightly backups keep a copy for 90 days.`
          }
          confirmLabel={outcome === "all" ? "Delete all calls" : "Delete these calls"}
          destructive
          onConfirm={() => removeAll.mutate(outcome === "all" ? null : outcome)}
        />
      )}
    </>
  );
}
