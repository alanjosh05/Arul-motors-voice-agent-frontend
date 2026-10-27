"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { AudioLines, CalendarPlus, ExternalLink, NotebookPen } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CallButton } from "@/components/actions";
import { CustomerAvatar } from "@/components/customer-avatar";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { DueBadge } from "@/components/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatDay, formatMobile } from "@/lib/format";
import { useDueServices, useVoiceEnabled } from "@/lib/queries";
import type { DueService } from "@/lib/types";
import { AppointmentDialog, LogCallDialog } from "@/components/forms/lazy";
import { RowAction } from "@/components/row-action";

function RowActions({ row }: { row: DueService }) {
  const [dialog, setDialog] = useState<"book" | "log" | null>(null);
  return (
    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
      <CallButton
        customer={{ id: row.customer_id, name: row.name, mobile_number: row.mobile_number }}
        subtitle={`${row.model} · ${row.next_service_type} due ${formatDay(row.next_service_date)}`}
        label="Call"
      />
      <Button variant="outline" size="sm" onClick={() => setDialog("book")}>
        <CalendarPlus /> Book
      </Button>
      <RowAction label="Log a call" icon={NotebookPen} onClick={() => setDialog("log")} />
      <RowAction label="View customer" icon={ExternalLink} href={`/customers/view/?id=${row.customer_id}`} />
      {dialog === "book" && <AppointmentDialog open={dialog === "book"} onOpenChange={(o) => !o && setDialog(null)} customerId={row.customer_id} vehicleId={row.vehicle_id} />}
      {dialog === "log" && <LogCallDialog open={dialog === "log"} onOpenChange={(o) => !o && setDialog(null)} customer={{ id: row.customer_id, name: row.name, vehicleId: row.vehicle_id }} />}
    </div>
  );
}

const columns: ColumnDef<DueService>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column} title="Customer" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CustomerAvatar name={row.original.name} />
        <div className="min-w-0">
          <Link href={`/customers/view/?id=${row.original.customer_id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:underline">
            {row.original.name}
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
  { accessorKey: "next_service_type", header: "Service due" },
  {
    accessorKey: "next_service_date",
    header: ({ column }) => <SortHeader column={column} title="Due" />,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <span className="tabular text-sm">{formatDay(row.original.next_service_date)}</span>
        <DueBadge date={row.original.next_service_date} serviceType={row.original.next_service_type} />
      </div>
    ),
  },
  { id: "actions", header: "", cell: ({ row }) => <RowActions row={row.original} /> },
];

export default function FollowUpsPage() {
  const [days, setDays] = useState("7");
  const { data, isLoading } = useDueServices(Number(days));
  const voiceOn = useVoiceEnabled();
  return (
    <>
      <PageHeader
        title="Follow-ups"
        description={
          voiceOn
            ? "Bikes whose service is due and not yet booked: the voice agent's call queue."
            : "Bikes whose service is due and not yet booked: customers to call."
        }
      />
      {voiceOn && (
        <Alert className="border-primary/20 bg-primary/5">
          <AudioLines className="text-primary" />
          <AlertTitle>Call with the AI agent</AlertTitle>
          <AlertDescription>
            The agent calls in Tanglish as Arul Motors Yamaha, Nazareth, confirms the date the customer will bring the bike in, books it and logs the outcome. Calls run in your browser until phone calling is enabled.
          </AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="Search name, bike, registration…"
        initialSorting={[{ id: "next_service_date", desc: false }]}
        emptyTitle="No follow-ups due"
        emptyDescription="Every bike due in this period is already booked."
        globalFilterFn={(r, q) => `${r.name} ${r.mobile_number} ${r.model} ${r.registration_number} ${r.next_service_type}`.toLowerCase().includes(q)}
        toolbar={
          <ToggleGroup type="single" variant="outline" size="sm" value={days} onValueChange={(v) => v && setDays(v)}>
            <ToggleGroupItem value="7">7 days</ToggleGroupItem>
            <ToggleGroupItem value="14">14 days</ToggleGroupItem>
            <ToggleGroupItem value="30">30 days</ToggleGroupItem>
          </ToggleGroup>
        }
      />
    </>
  );
}
