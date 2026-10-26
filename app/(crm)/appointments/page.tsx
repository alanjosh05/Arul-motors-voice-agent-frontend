"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppointmentActions } from "@/components/actions";
import { CustomerAvatar } from "@/components/customer-avatar";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { AppointmentStateBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDay, relativeDay, todayISO } from "@/lib/format";
import { useAppointments } from "@/lib/queries";
import type { Appointment } from "@/lib/types";
import { AppointmentDialog } from "@/components/forms/lazy";
import { BookingArt } from "@/components/art/booking";

const columns: ColumnDef<Appointment>[] = [
  {
    accessorKey: "appointment_date",
    header: ({ column }) => <SortHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <div>
        <p className="tabular font-medium">{formatDay(row.original.appointment_date)}</p>
        <p className="text-xs text-muted-foreground">{relativeDay(row.original.appointment_date)}</p>
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
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="text-sm">{row.original.model}</p>
        <span className="plate">{row.original.registration_number}</span>
      </div>
    ),
  },
  { accessorKey: "service_type", header: "Service" },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => <span className="line-clamp-2 max-w-60 text-sm text-muted-foreground">{row.original.notes ?? "—"}</span>,
  },
  {
    accessorKey: "id",
    header: "Booking",
    cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.id}</span>,
  },
  { id: "state", header: "Status", cell: ({ row }) => <AppointmentStateBadge state={row.original.state} /> },
  { id: "actions", header: "", cell: ({ row }) => <AppointmentActions appointment={row.original} /> },
];

const TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "missed", label: "Missed" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
] as const;

export default function AppointmentsPage() {
  const { data, isLoading } = useAppointments();
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("upcoming");
  const [open, setOpen] = useState(false);
  const today = todayISO();

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const pick = {
      upcoming: rows.filter((a) => a.state === "upcoming"),
      today: rows.filter((a) => a.state === "upcoming" && a.appointment_date === today),
      missed: rows.filter((a) => a.state === "missed"),
      completed: rows.filter((a) => a.state === "completed"),
      all: rows,
    };
    return pick;
  }, [data, today]);

  return (
    <>
      <PageHeader
        title="Appointments"
        description="The dates customers will bring their bikes in. No time slots: any time that day."
        actions={
          <Button onClick={() => setOpen(true)}>
            <CalendarPlus /> Book service
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="h-auto flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              {t.label}
              <span className="tabular rounded-full bg-muted px-1.5 text-xs text-muted-foreground group-data-[state=active]:bg-primary/10">
                {filtered[t.value].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <DataTable
        key={tab}
        columns={columns}
        data={filtered[tab]}
        loading={isLoading}
        searchPlaceholder="Search customer, bike, booking…"
        initialSorting={[{ id: "appointment_date", desc: tab !== "upcoming" && tab !== "today" }]}
        emptyArt={<BookingArt />}
        emptyTitle={tab === "today" ? "No bikes booked for today" : "No bookings here"}
        globalFilterFn={(a, q) => `${a.customer_name} ${a.model} ${a.registration_number} ${a.id} ${a.service_type} ${a.notes ?? ""}`.toLowerCase().includes(q)}
      />
      {open && <AppointmentDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
