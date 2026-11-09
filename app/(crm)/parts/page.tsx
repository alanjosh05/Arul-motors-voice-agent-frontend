"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { FileText, FileX, IndianRupee, Layers, Loader2, Package, Wrench } from "lucide-react";
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
  if (!use.has_report)
    return (
      <Button variant="ghost" size="sm" className="h-8 text-muted-foreground" disabled title="This service was closed without a job card PDF">
        <FileX /> No PDF
      </Button>
    );
  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8"
      disabled={opening}
      title="Open the scanned job card"
      onClick={(e) => {
        e.stopPropagation();
        setOpening(true);
        openFile(`/api/service-records/${use.record_id}/report`)
          .catch((err) => toast.error(errorMessage(err)))
          .finally(() => setOpening(false));
      }}
    >
      {opening ? <Loader2 className="animate-spin" /> : <FileText />} Job card
    </Button>
  );
}

/** A calendar-style date: "30" over "Oct 2026", weekday on hover. */
function DateChip({ date }: { date: string }) {
  const d = new Date(`${date}T00:00:00`);
  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border bg-muted/40 py-1.5 leading-none" title={formatDay(date)}>
      <span className="text-[10px] font-medium uppercase text-muted-foreground">{format(d, "EEE")}</span>
      <span className="tabular mt-1 text-lg font-semibold">{format(d, "dd")}</span>
      <span className="mt-1 text-[10px] text-muted-foreground">{format(d, "MMM yy")}</span>
    </div>
  );
}

function Bike({ use }: { use: PartUse }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium">
        <span className="truncate">{use.model}</span>
        <span className="plate">{use.registration_number}</span>
      </p>
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        {use.customer_name && (
          <Link href={`/customers/view/?id=${use.customer_id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-foreground/80 hover:underline">
            {use.customer_name}
          </Link>
        )}
        {use.service_type && <><span aria-hidden>·</span><span>{use.service_type}</span></>}
        {use.job_card_no && <><span aria-hidden>·</span><span className="tabular">Card {use.job_card_no}</span></>}
      </p>
    </div>
  );
}

function Qty({ use }: { use: PartUse }) {
  const each = use.amount ?? 0;
  return (
    <div className="text-right leading-tight">
      <p className="tabular text-sm font-semibold">{use.warranty ? "Free" : rupees(use.qty * each)}</p>
      <p className="tabular text-xs text-muted-foreground">
        {use.qty} × {rupees(each)}
      </p>
      {use.warranty && <ToneBadge tone="blue" className="mt-1">Warranty</ToneBadge>}
    </div>
  );
}

/** A part's numbers as written on its job cards (handwriting gives one part
 * several spellings): the first few, then "+N more", the full list on hover.
 * Kept short so a long list can't widen the table past the page. */
function PartNumbers({ numbers, show = 3 }: { numbers: string[]; show?: number }) {
  if (numbers.length === 0) return null;
  const rest = numbers.length - show;
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 whitespace-normal font-mono text-xs text-muted-foreground" title={numbers.join(", ")}>
      {numbers.slice(0, show).map((n) => (
        <span key={n}>{n}</span>
      ))}
      {rest > 0 && <span className="rounded bg-muted px-1.5 font-sans text-[11px]">+{rest} more</span>}
    </p>
  );
}

const partColumns: ColumnDef<PartUsage>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortHeader column={column} title="Part" />,
    cell: ({ row }) => (
      <div className="min-w-0 max-w-[22rem]">
        <p className="font-medium">{row.original.name}</p>
        <PartNumbers numbers={row.original.part_nos} />
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
        <p className="tabular whitespace-nowrap text-sm">{formatDay(row.original.date)}</p>
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
  { id: "bike", header: "Bike", cell: ({ row }) => <Bike use={row.original} /> },
  { accessorKey: "qty", header: ({ column }) => <SortHeader column={column} title="Qty · price" />, cell: ({ row }) => <Qty use={row.original} /> },
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
        <DialogContent className="gap-0 p-0 sm:max-w-3xl">
          {open && (
            <>
              <DialogHeader className="space-y-2 border-b p-6 pb-4">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Package className="size-5 text-primary" /> {open.name}
                </DialogTitle>
                <DialogDescription>Every job card it was used on, {rangeLabel(range, "past")}, newest first.</DialogDescription>
                <PartNumbers numbers={open.part_nos} show={6} />
              </DialogHeader>
              <div className="grid grid-cols-2 gap-px border-b bg-border sm:grid-cols-4">
                {[
                  ["Used", String(open.qty)],
                  ["Job cards", String(open.services)],
                  ["Charged", rupees(open.amount)],
                  ["Under warranty", String(open.warranty_qty)],
                ].map(([label, value]) => (
                  <div key={label} className="bg-background px-6 py-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="tabular text-lg font-semibold">{value}</p>
                  </div>
                ))}
              </div>
              <ul className="max-h-[55vh] divide-y overflow-y-auto">
                {open.uses.map((u, i) => (
                  <li key={`${u.record_id}-${i}`} className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-muted/40">
                    <DateChip date={u.date} />
                    <div className="min-w-0 flex-1">
                      <Bike use={u} />
                    </div>
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
