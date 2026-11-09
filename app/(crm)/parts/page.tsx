"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { FileText, FileX, IndianRupee, Layers, Loader2, Merge, Package, Search, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { type ChartRange, RangeFilter, rangeDates, rangeLabel } from "@/components/range-filter";
import { StatCard } from "@/components/stat-card";
import { ToneBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { errorMessage, openFile } from "@/lib/api";
import { formatDay } from "@/lib/format";
import { rupees } from "@/lib/job-card";
import { useMergePart, usePartUses, usePartsUsage, useUnmergePart } from "@/lib/queries";
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
        {row.original.merged.length > 0 && (
          <p className="truncate text-xs text-muted-foreground" title={row.original.merged.map((m) => m.name).join(", ")}>
            Includes {row.original.merged.map((m) => m.name).join(", ")}
          </p>
        )}
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

type Range = { start: string; end: string } | null;

/** One use: when, the part (in the every-use list), the bike and customer,
 * qty × price and the job card. */
function UseItem({ use, showPart }: { use: PartUse; showPart?: boolean }) {
  return (
    <li className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40 sm:px-6">
      <DateChip date={use.date} />
      <div className="min-w-0 flex-1 space-y-1">
        {showPart && (
          <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold">
            {use.name}
            {use.part_no && <span className="font-mono text-xs font-normal text-muted-foreground">{use.part_no}</span>}
          </p>
        )}
        <Bike use={use} />
      </div>
      <Qty use={use} />
      <JobCardButton use={use} />
    </li>
  );
}

/** Part uses, newest first, 50 at a time: the next page loads when the end of
 * the list scrolls into view (or with the button). */
function UsesList({ part, range, q, showPart, emptyText }: { part?: string; range: Range; q?: string; showPart?: boolean; emptyText: string }) {
  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } = usePartUses({ part, range, q });
  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);
  const total = data?.pages[0]?.total ?? 0;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = end.current;
    if (!el || !hasNextPage) return;
    const seen = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
    }, { rootMargin: "300px" });
    seen.observe(el);
    return () => seen.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading)
    return (
      <div className="space-y-3 p-4 sm:px-6">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
      </div>
    );
  if (items.length === 0) return <p className="px-6 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <div className={isFetching && !isFetchingNextPage ? "opacity-60 transition-opacity" : "transition-opacity"}>
      <ul className="divide-y">
        {items.map((u) => <UseItem key={u.id} use={u} showPart={showPart} />)}
      </ul>
      <div ref={end} className="flex items-center justify-between gap-3 border-t px-4 py-3 text-xs text-muted-foreground sm:px-6">
        <span className="tabular">
          Showing {items.length.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
        </span>
        {hasNextPage && (
          <Button variant="outline" size="sm" className="h-8" disabled={isFetchingNextPage} onClick={() => fetchNextPage()}>
            {isFetchingNextPage && <Loader2 className="animate-spin" />} Load more
          </Button>
        )}
      </div>
    </div>
  );
}

/** Every use, searchable on the server (part, bike, registration, customer, card no.). */
function EveryUse({ range, toolbar, emptyText }: { range: Range; toolbar: React.ReactNode; emptyText: string }) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text]);
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:max-w-xs sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search part, bike, registration, customer, card no…" className="pl-8" />
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{toolbar}</div>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <UsesList range={range} q={q} showPart emptyText={q ? `Nothing matches “${q}”.` : emptyText} />
      </div>
    </div>
  );
}

/** Admins: count this part's name as another part (spellings differ between job cards). */
function MergeDialog({ part, open, onOpenChange }: { part: PartUsage; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data } = usePartsUsage(null); // every part ever used, whatever the page's range
  const [into, setInto] = useState("");
  const merge = useMergePart();
  const options = (data?.parts ?? []).filter((p) => p.key !== part.key).sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Merge “{part.name}”</DialogTitle>
          <DialogDescription>
            Use this when job cards spell the same part differently. Its uses then count under the part you choose. You can unmerge it later.
          </DialogDescription>
        </DialogHeader>
        <Select value={into} onValueChange={setInto}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Count it as…" />
          </SelectTrigger>
          <SelectContent>
            {options.map((p) => (
              <SelectItem key={p.key} value={p.key}>
                {p.name} <span className="text-muted-foreground">· {p.qty} used</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!into || merge.isPending}
            onClick={() => merge.mutate({ part: part.key, into }, { onSuccess: () => onOpenChange(false) })}
          >
            <Merge /> Merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PartsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [range, setRange] = useState<ChartRange>({ preset: 30 });
  const [view, setView] = useState<"parts" | "uses">("parts");
  const dates = useMemo(() => rangeDates(range, "past"), [range]);
  const { data, isLoading } = usePartsUsage(dates);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [merging, setMerging] = useState<PartUsage | null>(null);
  const unmerge = useUnmergePart();
  const open = data?.parts.find((p) => p.key === openKey) ?? null;
  const totals = data?.totals;
  const columns = useMemo<ColumnDef<PartUsage>[]>(
    () =>
      isAdmin
        ? [
            ...partColumns,
            {
              id: "actions",
              header: "",
              cell: ({ row }) => (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-muted-foreground"
                  title="Count this part as another part"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMerging(row.original);
                  }}
                >
                  <Merge /> Merge
                </Button>
              ),
            },
          ]
        : partColumns,
    [isAdmin],
  );
  const toolbar = (
    <>
      <ToggleGroup type="single" variant="outline" size="sm" value={view} onValueChange={(v) => v && setView(v as typeof view)}>
        <ToggleGroupItem value="parts" className="px-2.5 text-xs">By part</ToggleGroupItem>
        <ToggleGroupItem value="uses" className="px-2.5 text-xs">Every use</ToggleGroupItem>
      </ToggleGroup>
      <RangeFilter value={range} onChange={setRange} allowAll />
    </>
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
          columns={columns}
          data={isLoading ? undefined : data?.parts}
          loading={isLoading}
          searchPlaceholder="Search part name or number…"
          initialSorting={[{ id: "qty", desc: true }]}
          onRowClick={(p) => setOpenKey(p.key)}
          emptyTitle="No parts used"
          emptyDescription={empty}
          globalFilterFn={(r, q) => `${r.name} ${r.part_nos.join(" ")} ${r.merged.map((m) => m.name).join(" ")}`.toLowerCase().includes(q)}
          toolbar={toolbar}
        />
      ) : (
        <EveryUse range={dates} toolbar={toolbar} emptyText={empty} />
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-3xl">
          {open && (
            <>
              <DialogHeader className="space-y-2 border-b p-6 pb-4">
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Package className="size-5 text-primary" /> {open.name}
                </DialogTitle>
                <DialogDescription>Every job card it was used on, {rangeLabel(range, "past")}, newest first.</DialogDescription>
                <PartNumbers numbers={open.part_nos} show={6} />
                {open.merged.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    Includes
                    {open.merged.map((m) => (
                      <span key={m.key} className="inline-flex items-center gap-1 rounded-md border bg-muted/40 py-0.5 pr-1 pl-2 text-foreground">
                        {m.name}
                        {isAdmin && (
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label={`Unmerge ${m.name}`}
                            title="Count it on its own again"
                            disabled={unmerge.isPending}
                            onClick={() => unmerge.mutate(m.key)}
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
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
              <div className="min-h-0 flex-1 overflow-y-auto">
                <UsesList part={open.key} range={dates} emptyText={empty} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {merging && <MergeDialog part={merging} open={!!merging} onOpenChange={(o) => !o && setMerging(null)} />}
    </>
  );
}
