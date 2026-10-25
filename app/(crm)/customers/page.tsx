"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CustomerActions } from "@/components/actions";
import { CustomerAvatar } from "@/components/customer-avatar";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { DueBadge, OutcomeBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { formatDay, formatMobile, timeAgo } from "@/lib/format";
import { useCustomers, usePrefetchCustomer } from "@/lib/queries";
import type { Customer } from "@/lib/types";
import { CustomerDialog } from "@/components/forms/lazy";

const nextDue = (c: Customer) => c.vehicles.map((v) => v.next_service_date).sort()[0] ?? "";

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column} title="Customer" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CustomerAvatar name={row.original.name} />
        <div className="min-w-0">
          <Link href={`/customers/view/?id=${row.original.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
            {row.original.name}
          </Link>
          <p className="text-xs text-muted-foreground">
            {formatMobile(row.original.mobile_number)}
            {row.original.alternate_mobile && <span title={formatMobile(row.original.alternate_mobile)}> · +1 number</span>}
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "bikes",
    header: "Bikes",
    cell: ({ row }) =>
      row.original.vehicles.length ? (
        <div className="space-y-1">
          {row.original.vehicles.map((v) => (
            <div key={v.id} className="flex items-center gap-2 text-sm">
              <span className="truncate">{v.model}</span>
              <span className="plate">{v.registration_number}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">No bike yet</span>
      ),
  },
  {
    id: "next_service",
    accessorFn: nextDue,
    header: ({ column }) => <SortHeader column={column} title="Next service" />,
    cell: ({ row }) => {
      const v = [...row.original.vehicles].sort((a, b) => a.next_service_date.localeCompare(b.next_service_date))[0];
      return v ? (
        <div className="flex flex-col items-start gap-1">
          <span className="text-sm">{v.next_service_type}</span>
          <DueBadge date={v.next_service_date} serviceType={v.next_service_type} />
        </div>
      ) : (
        "—"
      );
    },
  },
  {
    id: "booking",
    accessorFn: (c) => c.next_appointment?.appointment_date ?? "",
    header: ({ column }) => <SortHeader column={column} title="Booked for" />,
    cell: ({ row }) =>
      row.original.next_appointment ? (
        <span className="tabular text-sm font-medium text-primary">{formatDay(row.original.next_appointment.appointment_date)}</span>
      ) : (
        <span className="text-sm text-muted-foreground">Not booked</span>
      ),
  },
  {
    id: "last_call",
    accessorFn: (c) => c.last_call?.created_at ?? "",
    header: ({ column }) => <SortHeader column={column} title="Last call" />,
    cell: ({ row }) =>
      row.original.last_call ? (
        <div className="flex flex-col items-start gap-1">
          <OutcomeBadge outcome={row.original.last_call.outcome} />
          <span className="text-xs text-muted-foreground">{timeAgo(row.original.last_call.created_at)}</span>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Never called</span>
      ),
  },
  { id: "actions", header: "", cell: ({ row }) => <CustomerActions customer={row.original} /> },
];

export default function CustomersPage() {
  const { data, isLoading } = useCustomers();
  const router = useRouter();
  const prefetch = usePrefetchCustomer();
  const [open, setOpen] = useState(false);
  return (
    <>
      <PageHeader
        title="Customers"
        description={data ? `${data.length} customers · ${data.reduce((n, c) => n + c.vehicles.length, 0)} bikes` : "Everyone who bought a bike from the showroom."}
        actions={
          <Button onClick={() => setOpen(true)}>
            <UserPlus /> Add customer
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        loading={isLoading}
        searchPlaceholder="Search name, mobile, registration, model…"
        onRowClick={(c) => router.push(`/customers/view/?id=${c.id}`)}
        onRowHover={(c) => prefetch(c.id)}
        emptyTitle="No customers yet"
        emptyDescription="Add a customer with the bike they bought to start follow-ups."
        globalFilterFn={(c, q) =>
          `${c.name} ${c.mobile_number} ${c.alternate_mobile ?? ""} ${c.vehicles.map((v) => `${v.model} ${v.registration_number} ${v.registration_number.replace(/\s/g, "")}`).join(" ")}`
            .toLowerCase()
            .includes(q.replace(/\s+/g, " "))
        }
      />
      {open && <CustomerDialog open={open} onOpenChange={setOpen} onCreated={(id) => router.push(`/customers/view/?id=${id}`)} />}
    </>
  );
}
