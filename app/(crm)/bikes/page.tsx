"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus, Ellipsis, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { DueBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { daysFromToday, formatDate, formatDay, formatKm, formatMobile } from "@/lib/format";
import { useDeleteVehicle, useVehicles } from "@/lib/queries";
import type { Vehicle } from "@/lib/types";
import { AppointmentDialog, CustomerDialog, VehicleDialog } from "@/components/forms/lazy";

function BikeActions({ vehicle }: { vehicle: Vehicle }) {
  const [dialog, setDialog] = useState<"edit" | "book" | "delete" | null>(null);
  const remove = useDeleteVehicle();
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Bike actions">
            <Ellipsis />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setDialog("book")}>
            <CalendarPlus /> Book service
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("edit")}>
            <Pencil /> Edit bike
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/customers/view/?id=${vehicle.customer_id}`}>
              <ExternalLink /> View owner
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
            <Trash2 /> Delete bike
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog === "edit" && <VehicleDialog open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} vehicle={vehicle} />}
      {dialog === "book" && <AppointmentDialog open={dialog === "book"} onOpenChange={(o) => !o && setDialog(null)} customerId={vehicle.customer_id} vehicleId={vehicle.id} />}
      {dialog === "delete" && <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Delete ${vehicle.model} (${vehicle.registration_number})?`}
        description="The bike and its service bookings are deleted. Call history is kept."
        confirmLabel="Delete bike"
        destructive
        onConfirm={() => remove.mutate(vehicle.id)}
      />}
    </div>
  );
}

const columns: ColumnDef<Vehicle>[] = [
  {
    accessorKey: "model",
    header: ({ column }) => <SortHeader column={column} title="Bike" />,
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium">{row.original.model}</p>
        <span className="plate">{row.original.registration_number}</span>
      </div>
    ),
  },
  {
    accessorKey: "customer_name",
    header: ({ column }) => <SortHeader column={column} title="Owner" />,
    cell: ({ row }) => (
      <div>
        <Link href={`/customers/view/?id=${row.original.customer_id}`} className="font-medium hover:underline">
          {row.original.customer_name}
        </Link>
        <p className="text-xs text-muted-foreground">{formatMobile(row.original.mobile_number)}</p>
      </div>
    ),
  },
  {
    accessorKey: "purchase_date",
    header: ({ column }) => <SortHeader column={column} title="Purchased" />,
    cell: ({ row }) => <span className="tabular text-sm">{formatDate(row.original.purchase_date)}</span>,
  },
  {
    accessorKey: "odometer_km",
    header: "Odometer",
    cell: ({ row }) => <span className="tabular text-sm">{formatKm(row.original.odometer_km)}</span>,
  },
  {
    accessorKey: "last_service_date",
    header: ({ column }) => <SortHeader column={column} title="Last service" />,
    cell: ({ row }) => (
      <span className="tabular text-sm">{row.original.last_service_date ? formatDate(row.original.last_service_date) : "Never"}</span>
    ),
  },
  {
    accessorKey: "next_service_date",
    header: ({ column }) => <SortHeader column={column} title="Next service" />,
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <span className="text-sm">
          {row.original.next_service_type} · <span className="tabular">{formatDay(row.original.next_service_date)}</span>
        </span>
        <DueBadge date={row.original.next_service_date} />
      </div>
    ),
  },
  { id: "actions", header: "", cell: ({ row }) => <BikeActions vehicle={row.original} /> },
];

export default function BikesPage() {
  const { data, isLoading } = useVehicles();
  const [open, setOpen] = useState(false);
  const dueSoon = data?.filter((v) => daysFromToday(v.next_service_date) <= 7).length ?? 0;
  return (
    <>
      <PageHeader
        title="Bikes"
        description={data ? `${data.length} bikes sold · ${dueSoon} due for service within a week` : "Every bike sold by the showroom."}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus /> New bike sale
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="Search model, registration, owner…"
        initialSorting={[{ id: "next_service_date", desc: false }]}
        emptyTitle="No bikes yet"
        emptyDescription="Record a bike sale to start service follow-ups."
        globalFilterFn={(v, q) =>
          `${v.model} ${v.registration_number} ${v.registration_number.replace(/\s/g, "")} ${v.customer_name} ${v.mobile_number}`.toLowerCase().includes(q)
        }
      />
      {open && <CustomerDialog open={open} onOpenChange={setOpen} />}
    </>
  );
}
