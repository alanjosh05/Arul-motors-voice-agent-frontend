"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Pencil, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { InsuranceArt } from "@/components/art/insurance";
import { CustomerAvatar } from "@/components/customer-avatar";
import { DataTable, SortHeader } from "@/components/data-table";
import { VehicleDialog } from "@/components/forms/lazy";
import { PageHeader } from "@/components/page-header";
import { RowAction, RowActions } from "@/components/row-action";
import { ToneBadge } from "@/components/status-badges";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { daysFromToday, formatDay, formatMobile } from "@/lib/format";
import { INSURANCE_REMIND_DAYS, insuranceStatus, type InsuranceStatus } from "@/lib/insurance";
import { useVehicles } from "@/lib/queries";
import type { Vehicle } from "@/lib/types";

function StatusBadge({ expiry }: { expiry?: string | null }) {
  const status = insuranceStatus(expiry);
  if (status === "none") return <ToneBadge tone="gray">Not added</ToneBadge>;
  const n = daysFromToday(expiry!);
  if (status === "expired") return <ToneBadge tone="red">{`Expired ${-n} day${n === -1 ? "" : "s"} ago`}</ToneBadge>;
  if (status === "soon") return <ToneBadge tone="amber">{n === 0 ? "Expires today" : `Expires in ${n} day${n === 1 ? "" : "s"}`}</ToneBadge>;
  return <ToneBadge tone="green">Valid</ToneBadge>;
}

function Actions({ vehicle }: { vehicle: Vehicle }) {
  const [edit, setEdit] = useState(false);
  return (
    <RowActions>
      <RowAction label="Update insurance" icon={Pencil} onClick={() => setEdit(true)} />
      <RowAction label="View owner" icon={ExternalLink} href={`/customers/view/?id=${vehicle.customer_id}`} />
      {edit && <VehicleDialog open={edit} onOpenChange={setEdit} vehicle={vehicle} />}
    </RowActions>
  );
}

const columns: ColumnDef<Vehicle>[] = [
  {
    accessorKey: "customer_name",
    header: ({ column }) => <SortHeader column={column} title="Owner" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CustomerAvatar name={row.original.customer_name ?? ""} />
        <div className="min-w-0">
          <Link href={`/customers/view/?id=${row.original.customer_id}`} className="font-medium hover:underline">
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
    // Bikes without a policy sort last.
    sortUndefined: "last",
    cell: ({ row }) => (
      <div className="flex flex-col items-start gap-1">
        <span className="tabular text-sm">{row.original.insurance_expiry ? formatDay(row.original.insurance_expiry) : "—"}</span>
        <StatusBadge expiry={row.original.insurance_expiry} />
      </div>
    ),
  },
  { id: "actions", header: "", cell: ({ row }) => <Actions vehicle={row.original} /> },
];

export default function InsurancePage() {
  const { data, isLoading } = useVehicles();
  const [filter, setFilter] = useState<"reminders" | InsuranceStatus | "all">("reminders");
  const counts = useMemo(() => {
    const c = { expired: 0, soon: 0, none: 0, valid: 0 };
    data?.forEach((v) => c[insuranceStatus(v.insurance_expiry)]++);
    return c;
  }, [data]);
  const rows = useMemo(
    () =>
      (data ?? []).filter((v) => {
        const s = insuranceStatus(v.insurance_expiry);
        return filter === "all" || (filter === "reminders" ? s === "expired" || s === "soon" : s === filter);
      }),
    [data, filter],
  );
  return (
    <>
      <PageHeader title="Insurance" description="Each bike's insurance policy and when it expires, with reminders before it does." />
      {counts.expired + counts.soon > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <ShieldAlert className="text-amber-600" />
          <AlertTitle>Insurance reminders</AlertTitle>
          <AlertDescription>
            {counts.expired > 0 && `${counts.expired} bike${counts.expired === 1 ? "" : "s"} with expired insurance. `}
            {counts.soon > 0 && `${counts.soon} expiring in the next ${INSURANCE_REMIND_DAYS} days. `}
            Call these customers to renew.
          </AlertDescription>
        </Alert>
      )}
      <DataTable
        columns={columns}
        data={isLoading ? undefined : rows}
        loading={isLoading}
        searchPlaceholder="Search name, bike, registration, company…"
        initialSorting={[{ id: "insurance_expiry", desc: false }]}
        emptyArt={filter === "reminders" ? <InsuranceArt /> : undefined}
        emptyTitle={filter === "reminders" ? "No reminders" : "No bikes here"}
        emptyDescription={filter === "reminders" ? "No insurance has expired or expires soon." : "Nothing matches this filter."}
        globalFilterFn={(r, q) => `${r.customer_name} ${r.mobile_number} ${r.model} ${r.registration_number} ${r.insurance_provider ?? ""} ${r.insurance_policy_no ?? ""}`.toLowerCase().includes(q)}
        toolbar={
          <ToggleGroup type="single" variant="outline" size="sm" value={filter} onValueChange={(v) => v && setFilter(v as typeof filter)}>
            <ToggleGroupItem value="reminders">Reminders ({counts.expired + counts.soon})</ToggleGroupItem>
            <ToggleGroupItem value="expired">Expired ({counts.expired})</ToggleGroupItem>
            <ToggleGroupItem value="none">Not added ({counts.none})</ToggleGroupItem>
            <ToggleGroupItem value="all">All</ToggleGroupItem>
          </ToggleGroup>
        }
      />
    </>
  );
}
