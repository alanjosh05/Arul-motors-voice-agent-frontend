"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { FileText, IndianRupee, Layers, Package, Wrench } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { type ChartRange, RangeFilter, rangeDates, rangeLabel } from "@/components/range-filter";
import { StatCard } from "@/components/stat-card";
import { ToneBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage, openFile } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { rupees } from "@/lib/job-card";
import { usePartsUsage } from "@/lib/queries";
import type { PartUsage, PartUse } from "@/lib/types";

/** Opens the scanned job card PDF of the service the part was used in. */
function JobCardButton({ use }: { use: PartUse }) {
  const [opening, setOpening] = useState(false);
  if (!use.has_report) return <span className="text-xs text-muted-foreground">No PDF</span>;
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-7"
      disabled={opening}
      onClick={(e) => {
        e.stopPropagation();
        setOpening(true);
        openFile(`/api/service-records/${use.record_id}/report`)
          .catch((err) => toast.error(errorMessage(err)))
          .finally(() => setOpening(false));
      }}
    >
      <FileText /> {use.job_card_no ? `Card ${use.job_card_no}` : "Job card"}
    </Button>
  );
}

function Bike({ use }: { use: PartUse }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-sm">
        {use.model} <span className="plate">{use.registration_number}</span>
      </p>
      <Link href={`/customers/view/?id=${use.customer_id}`} className="text-xs text-muted-foreground hover:underline">
        {use.customer_name}
      </Link>
    </div>
  );
}

const Qty = ({ use }: { use: PartUse }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="tabular font-medium">×{use.qty}</span>
    {use.warranty ? <ToneBadge tone="blue">warranty</ToneBadge> : <span className="tabular text-xs text-muted-foreground">{rupees(use.qty * use.amount)}</span>}
  </div>
);

const partColumns: ColumnDef<PartUsage>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column} title="Part" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        {row.original.part_nos.length > 0 && <p className="font-mono text-xs text-muted-foreground">{row.original.part_nos.join(", ")}</p>}
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

type UseRow = PartUse & { name: string; key: string };

const useColumns: ColumnDef<UseRow>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => <SortHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <div>
        <p className="tabular text-sm">{formatDay(row.original.date)}</p>
        <p className="text-xs text-muted-foreground">{row.original.service_type}</p>
      </div>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column} title="Part" />,
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.name}</p>
        {row.original.part_no && <p className="font-mono text-xs text-muted-foreground">{row.original.part_no}</p>}
      </div>
    ),
  },
  { accessorKey: "qty", header: ({ column }) => <SortHeader column={column} title="Qty" />, cell: ({ row }) => <Qty use={row.original} /> },
  { id: "bike", header: "Bike", cell: ({ row }) => <Bike use={row.original} /> },
  { id: "card", header: "Job card", cell: ({ row }) => <JobCardButton use={row.original} /> },
];

export default function PartsPage() {
  const [range, setRange] = useState<ChartRange>({ preset: "all" });
  const [view, setView] = useState<"parts" | "uses">("parts");
  const dates = useMemo(() => rangeDates(range, "past"), [range]);
  const { data, isLoading } = usePartsUsage(dates);
  const [open, setOpen] = useState<PartUsage | null>(null);
  const totals = data?.totals;
  const uses = useMemo<UseRow[]>(
    () => (data?.parts ?? []).flatMap((p) => p.uses.map((u, i) => ({ ...u, name: p.name, key: `${p.name}-${u.record_id}-${i}` }))),
    [data],
  );
  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as typeof view)}>
        <ToggleGroupItem value="parts" className="px-2.5 text-xs">By part</ToggleGroupItem>
        <ToggleGroupItem value="uses" className="px-2.5 text-xs">Every use ({uses.length})</ToggleGroupItem>
      </ToggleGroup>
      <RangeFilter value={range} onChange={setRange} allowAll />
    </div>
  );
  const empty = `No job card in ${rangeLabel(range, "past")} lists any parts.`;
  return (
    <>
      <PageHeader
        title="Parts used"
        description="Every part used in the workshop, from the job cards of closed services: on which bike, when, and the job card itself."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kinds of parts" value={totals?.kinds ?? 0} icon={Layers} loading={isLoading} />
        <StatCard label="Parts used" value={totals?.qty ?? 0} icon={Package} tone="success" loading={isLoading} />
        <StatCard label="Job cards with parts" value={totals?.services ?? 0} icon={Wrench} tone="warning" loading={isLoading} />
        <StatCard label="Charged to customers" value={rupees(totals?.amount)} icon={IndianRupee} loading={isLoading} />
      </div>
      {view === "parts" ? (
        <DataTable
          key="parts"
          columns={partColumns}
          data={isLoading ? undefined : data?.parts}
          loading={isLoading}
          searchPlaceholder="Search part name or number…"
          initialSorting={[{ id: "qty", desc: true }]}
          onRowClick={setOpen}
          emptyTitle="No parts used"
          emptyDescription={empty}
          globalFilterFn={(r, q) => `${r.name} ${r.part_nos.join(" ")}`.toLowerCase().includes(q)}
          toolbar={toolbar}
        />
      ) : (
        <DataTable
          key="uses"
          columns={useColumns}
          data={isLoading ? undefined : uses}
          loading={isLoading}
          searchPlaceholder="Search part, bike, registration, customer, card no…"
          initialSorting={[{ id: "date", desc: true }]}
          emptyTitle="No parts used"
          emptyDescription={empty}
          globalFilterFn={(r, q) =>
            `${r.name} ${r.part_no ?? ""} ${r.model} ${r.registration_number} ${r.customer_name} ${r.job_card_no ?? ""}`.toLowerCase().includes(q)
          }
          toolbar={toolbar}
        />
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="sm:max-w-2xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle>{open.name}</DialogTitle>
                <DialogDescription>
                  {open.qty} used on {open.services} job card{open.services === 1 ? "" : "s"}, {rangeLabel(range, "past")}.
                </DialogDescription>
              </DialogHeader>
              <ul className="max-h-[60vh] divide-y overflow-y-auto pr-1 text-sm">
                {open.uses.map((u, i) => (
                  <li key={`${u.record_id}-${i}`} className="grid grid-cols-[6.5rem_1fr_auto_auto] items-center gap-3 py-2.5">
                    <div>
                      <p className="tabular">{formatDay(u.date)}</p>
                      <p className="text-xs text-muted-foreground">{u.service_type}</p>
                    </div>
                    <Bike use={u} />
                    <Qty use={u} />
                    <JobCardButton use={u} />
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
