"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus, Crown, ExternalLink, Motorbike, Pencil, Plus, Trash2, Users } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataTable, SortHeader } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { DueBadge, OilChangeBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { daysFromToday, formatDate, formatDay, formatKm, formatMobile } from "@/lib/format";
import { useBikeModelList, useDeleteBikeModel, useDeleteVehicle, useVehicles } from "@/lib/queries";
import type { BikeModel, Vehicle } from "@/lib/types";
import { AppointmentDialog, BikeModelDialog, VehicleDialog } from "@/components/forms/lazy";
import { RowAction, RowActions } from "@/components/row-action";

// Charts in their own chunk (recharts), after the numbers.
const chartLoading = () => <Skeleton className="h-[240px] w-full" />;
const CustomersByModelChart = dynamic(() => import("@/components/bikes/model-charts").then((m) => m.CustomersByModelChart), { ssr: false, loading: chartLoading });
const SourceChart = dynamic(() => import("@/components/bikes/model-charts").then((m) => m.SourceChart), { ssr: false, loading: chartLoading });

function BikeActions({ vehicle }: { vehicle: Vehicle }) {
  const [dialog, setDialog] = useState<"edit" | "book" | "delete" | null>(null);
  const remove = useDeleteVehicle();
  return (
    <RowActions>
      <RowAction label="Book service" icon={CalendarPlus} onClick={() => setDialog("book")} />
      <RowAction label="Edit bike" icon={Pencil} onClick={() => setDialog("edit")} />
      <RowAction label="View owner" icon={ExternalLink} href={`/customers/view/?id=${vehicle.customer_id}`} />
      <RowAction label="Delete bike" icon={Trash2} destructive onClick={() => setDialog("delete")} />
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
    </RowActions>
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
    cell: ({ row }) => {
      const v = row.original;
      return (
        <div className="space-y-0.5">
          <span className="tabular block text-sm">{v.purchase_date ? formatDate(v.purchase_date) : <span className="text-muted-foreground">Not known</span>}</span>
          {!!v.bought_elsewhere && (
            <span className="block max-w-36 truncate text-xs text-muted-foreground" title={v.dealer_name ?? undefined}>
              {v.dealer_name || "Another dealer"}
            </span>
          )}
        </div>
      );
    },
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
          {row.original.next_service_type}
          {!row.original.next_due_pending && <> · <span className="tabular">{formatDay(row.original.next_service_date)}</span></>}
        </span>
        {row.original.next_due_pending ? (
          <OilChangeBadge />
        ) : (
          <DueBadge date={row.original.next_service_date} serviceType={row.original.next_service_type} />
        )}
      </div>
    ),
  },
  { id: "actions", header: "", cell: ({ row }) => <BikeActions vehicle={row.original} /> },
];

/** A model's actions, side by side: see owners, rename, delete (when unused). */
function ModelActions({ model, onView, onRename, onDelete }: { model: BikeModel; onView: () => void; onRename: () => void; onDelete: () => void }) {
  return (
    <RowActions>
      <RowAction label="View customers" icon={Users} onClick={onView} disabled={!model.bikes} disabledReason="No bikes of this model yet" />
      <RowAction label="Rename" icon={Pencil} onClick={onRename} />
      <RowAction label="Delete model" icon={Trash2} destructive onClick={onDelete}
        disabled={model.bikes > 0} disabledReason="In use: change those bikes' model first" />
    </RowActions>
  );
}

/** Customers who own a model (from the Models table). */
function ModelOwners({ model, vehicles, onClose }: { model: BikeModel; vehicles: Vehicle[]; onClose: () => void }) {
  const owners = vehicles.filter((v) => v.model.toLowerCase() === model.name.toLowerCase());
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{model.name}</SheetTitle>
          <SheetDescription>
            {model.customers} customer{model.customers === 1 ? "" : "s"} · {model.bikes} bike{model.bikes === 1 ? "" : "s"} · {model.due_soon} due this week
          </SheetDescription>
        </SheetHeader>
        <ul className="scroll-y flex-1 space-y-2 px-4 pb-4">
          {owners.map((v) => (
            <li key={v.id}>
              <Link href={`/customers/view/?id=${v.customer_id}`} className="block rounded-lg border p-3 transition-colors hover:bg-muted/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{v.customer_name}</span>
                  <span className="plate">{v.registration_number}</span>
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="tabular">{formatMobile(v.mobile_number)}</span>
                  <span>
                    {v.next_service_type}
                    {!v.next_due_pending && ` · ${formatDay(v.next_service_date)}`}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}

/** Bikes: the model list (add, rename, delete) with who owns what, plus every bike. */
export default function BikesPage() {
  const { data: vehicles, isLoading } = useVehicles();
  const { data: models, isLoading: modelsLoading } = useBikeModelList();
  const removeModel = useDeleteBikeModel();
  const [tab, setTab] = useState<"models" | "bikes">("models");
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState<BikeModel | null>(null);
  const [deleting, setDeleting] = useState<BikeModel | null>(null);
  const [viewing, setViewing] = useState<BikeModel | null>(null);

  const list = models ?? [];
  const bikes = vehicles ?? [];
  const customers = useMemo(() => new Set((vehicles ?? []).map((v) => v.customer_id)).size, [vehicles]);
  const dueSoon = bikes.filter((v) => !v.next_due_pending && daysFromToday(v.next_service_date) <= 7).length;
  const top = list.find((m) => m.bikes > 0);
  const maxCustomers = Math.max(1, ...list.map((m) => m.customers));

  const modelColumns: ColumnDef<BikeModel>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => <SortHeader column={column} title="Model" />,
      cell: ({ row }) => (
        <div className="min-w-48 space-y-1.5">
          <div className="flex items-center gap-2 font-medium">
            <Motorbike className="size-3.5 shrink-0 text-muted-foreground" />
            {row.original.name}
          </div>
          <div className="h-1.5 w-full max-w-56 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(row.original.customers / maxCustomers) * 100}%` }} />
          </div>
        </div>
      ),
    },
    { accessorKey: "customers", header: ({ column }) => <SortHeader column={column} title="Customers" />, cell: ({ row }) => <span className="tabular font-semibold">{row.original.customers}</span> },
    { accessorKey: "bikes", header: ({ column }) => <SortHeader column={column} title="Bikes" />, cell: ({ row }) => <span className="tabular">{row.original.bikes}</span> },
    {
      accessorKey: "due_soon",
      header: ({ column }) => <SortHeader column={column} title="Due this week" />,
      cell: ({ row }) => <span className={row.original.due_soon ? "tabular font-medium text-amber-700 dark:text-amber-400" : "tabular text-muted-foreground"}>{row.original.due_soon}</span>,
    },
    { accessorKey: "bought_elsewhere", header: ({ column }) => <SortHeader column={column} title="Another dealer" />, cell: ({ row }) => <span className="tabular">{row.original.bought_elsewhere}</span> },
    { accessorKey: "services", header: ({ column }) => <SortHeader column={column} title="Services done" />, cell: ({ row }) => <span className="tabular">{row.original.services}</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <ModelActions
          model={row.original}
          onView={() => setViewing(row.original)}
          onRename={() => setRenaming(row.original)}
          onDelete={() => setDeleting(row.original)}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Bikes"
        description={models ? `${list.length} models · ${bikes.length} bikes · ${dueSoon} due within a week` : "Bike models and every bike on record."}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add bike model
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bike models" icon={Motorbike} loading={modelsLoading} value={list.length} hint={`${list.filter((m) => !m.bikes).length} with no bikes yet`} />
        <StatCard label="Bikes on record" icon={Motorbike} tone="success" loading={isLoading} value={bikes.length} hint={`${dueSoon} due within a week`} />
        <StatCard label="Customers with bikes" icon={Users} tone="warning" loading={isLoading} value={customers} hint={`${bikes.filter((v) => v.bought_elsewhere).length} bikes from another dealer`} />
        <StatCard
          label="Most popular"
          icon={Crown}
          loading={modelsLoading}
          value={<span className="block truncate text-2xl">{top?.name ?? "—"}</span>}
          hint={top ? `${top.customers} customer${top.customers === 1 ? "" : "s"} · ${top.bikes} bike${top.bikes === 1 ? "" : "s"}` : "No bikes yet"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Customers by model</CardTitle>
            <CardDescription>Which models most of our customers ride (top 10)</CardDescription>
          </CardHeader>
          <CardContent>{modelsLoading ? chartLoading() : <CustomersByModelChart models={list} />}</CardContent>
        </Card>
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Where they were bought</CardTitle>
            <CardDescription>Sold here, or bought from another dealer and serviced here</CardDescription>
          </CardHeader>
          <CardContent>{modelsLoading ? chartLoading() : <SourceChart models={list} />}</CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-4">
        <TabsList>
          <TabsTrigger value="models" className="gap-1.5">
            Models <span className="tabular rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{list.length}</span>
          </TabsTrigger>
          <TabsTrigger value="bikes" className="gap-1.5">
            All bikes <span className="tabular rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{bikes.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="models">
          <DataTable
            columns={modelColumns}
            data={models}
            loading={modelsLoading}
            searchPlaceholder="Search models…"
            initialSorting={[{ id: "customers", desc: true }]}
            onRowClick={(m) => m.bikes && setViewing(m)}
            emptyTitle="No bike models yet"
            emptyDescription="Add the models the showroom sells and services; they then appear when adding a customer or bike."
            globalFilterFn={(m, q) => m.name.toLowerCase().includes(q)}
          />
        </TabsContent>
        <TabsContent value="bikes">
          <DataTable
            columns={columns}
            data={vehicles}
            loading={isLoading}
            searchPlaceholder="Search model, registration, owner…"
            initialSorting={[{ id: "next_service_date", desc: false }]}
            emptyTitle="No bikes yet"
            emptyDescription="Add a bike, sold here or bought from another dealer, to start service follow-ups."
            globalFilterFn={(v, q) =>
              `${v.model} ${v.registration_number} ${v.registration_number.replace(/\s/g, "")} ${v.customer_name} ${v.mobile_number}`.toLowerCase().includes(q)
            }
          />
        </TabsContent>
      </Tabs>

      {adding && <BikeModelDialog open={adding} onOpenChange={setAdding} />}
      {renaming && <BikeModelDialog open={!!renaming} onOpenChange={(o) => !o && setRenaming(null)} model={renaming} />}
      {viewing && <ModelOwners model={viewing} vehicles={bikes} onClose={() => setViewing(null)} />}
      {deleting && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setDeleting(null)}
          title={`Delete ${deleting.name}?`}
          description="It's taken off the model list. (Only models no bike uses can be deleted.)"
          confirmLabel="Delete model"
          destructive
          onConfirm={() => removeModel.mutate(deleting.id)}
        />
      )}
    </>
  );
}
