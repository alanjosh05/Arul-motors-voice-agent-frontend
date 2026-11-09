"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { IndianRupee, Layers, Package, Wrench } from "lucide-react";
import { useMemo, useState } from "react";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { type ChartRange, RangeFilter, rangeDates, rangeLabel } from "@/components/range-filter";
import { StatCard } from "@/components/stat-card";
import { ToneBadge } from "@/components/status-badges";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDay } from "@/lib/format";
import { rupees } from "@/lib/job-card";
import { usePartsUsage } from "@/lib/queries";
import type { PartUsage } from "@/lib/types";

const columns: ColumnDef<PartUsage>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column} title="Part" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        {row.original.part_nos.length > 0 && (
          <p className="font-mono text-xs text-muted-foreground">{row.original.part_nos.join(", ")}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "qty",
    header: ({ column }) => <SortHeader column={column} title="Used" />,
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="tabular font-medium">{row.original.qty}</span>
        {row.original.warranty_qty > 0 && <ToneBadge tone="blue">{row.original.warranty_qty} warranty</ToneBadge>}
      </div>
    ),
  },
  {
    accessorKey: "services",
    header: ({ column }) => <SortHeader column={column} title="Job cards" />,
    cell: ({ row }) => <span className="tabular">{row.original.services}</span>,
  },
  {
    accessorKey: "amount",
    header: ({ column }) => <SortHeader column={column} title="Charged" />,
    cell: ({ row }) => <span className="tabular">{rupees(row.original.amount)}</span>,
  },
  {
    accessorKey: "last_used",
    header: ({ column }) => <SortHeader column={column} title="Last used" />,
    cell: ({ row }) => <span className="tabular text-sm">{formatDay(row.original.last_used)}</span>,
  },
];

export default function PartsPage() {
  const [range, setRange] = useState<ChartRange>({ preset: "all" });
  const dates = useMemo(() => rangeDates(range, "past"), [range]);
  const { data, isLoading } = usePartsUsage(dates);
  const [open, setOpen] = useState<PartUsage | null>(null);
  const totals = data?.totals;
  return (
    <>
      <PageHeader
        title="Parts used"
        description="Everything the workshop has used, added up from the job cards uploaded when services are closed."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kinds of parts" value={totals?.kinds ?? 0} icon={Layers} loading={isLoading} />
        <StatCard label="Parts used" value={totals?.qty ?? 0} icon={Package} tone="success" loading={isLoading} />
        <StatCard label="Job cards with parts" value={totals?.services ?? 0} icon={Wrench} tone="warning" loading={isLoading} />
        <StatCard label="Charged to customers" value={rupees(totals?.amount)} icon={IndianRupee} loading={isLoading} />
      </div>
      <DataTable
        columns={columns}
        data={isLoading ? undefined : data?.parts}
        loading={isLoading}
        searchPlaceholder="Search part name or number…"
        initialSorting={[{ id: "qty", desc: true }]}
        onRowClick={setOpen}
        emptyTitle="No parts used"
        emptyDescription={`No job card in ${rangeLabel(range, "past")} lists any parts.`}
        globalFilterFn={(r, q) => `${r.name} ${r.part_nos.join(" ")}`.toLowerCase().includes(q)}
        toolbar={<RangeFilter value={range} onChange={setRange} allowAll />}
      />
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.name}</DialogTitle>
                <DialogDescription>
                  {open.qty} used on {open.services} job card{open.services === 1 ? "" : "s"}
                  {open.uses.length < open.services ? ` (latest ${open.uses.length} shown)` : ""}.
                </DialogDescription>
              </DialogHeader>
              <ul className="max-h-80 divide-y overflow-y-auto text-sm">
                {open.uses.map((u, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="tabular">{formatDay(u.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.model} · <span className="plate">{u.registration_number}</span>
                        {u.job_card_no ? ` · Card ${u.job_card_no}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {u.warranty && <ToneBadge tone="blue">warranty</ToneBadge>}
                      <span className="tabular font-medium">×{u.qty}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
