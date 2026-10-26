"use client";

import {
  ArrowLeft,
  CalendarPlus,
  Ellipsis,
  Motorbike,
  NotebookPen,
  Pencil,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AppointmentActions, CallButton } from "@/components/actions";
import { ServiceHistory } from "@/components/service-history";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CustomerAvatar } from "@/components/customer-avatar";
import { AppointmentStateBadge, DueBadge, OilChangeBadge, OutcomeBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { daysFromToday, formatDate, formatDay, formatKm, formatMobile, formatTimestamp, parseTimestamp } from "@/lib/format";
import { useCustomer, useDeleteCustomer, useDeleteVehicle, useServiceTypes, useUpdateCustomer } from "@/lib/queries";
import type { CustomerDetail, Vehicle } from "@/lib/types";
import { AppointmentDialog, CloseServiceDialog, CustomerDialog, LogCallDialog, VehicleDialog } from "@/components/forms/lazy";
import { BookingArt } from "@/components/art/booking";
import { CallArt } from "@/components/art/call";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium">{children}</div>
    </div>
  );
}

function BikeCard({ vehicle, customer }: { vehicle: Vehicle; customer: CustomerDetail }) {
  const [dialog, setDialog] = useState<"edit" | "book" | "service" | "delete" | null>(null);
  const remove = useDeleteVehicle();
  const booking = customer.appointments.find((a) => a.vehicle_id === vehicle.id && a.state === "upcoming");
  const { data: types } = useServiceTypes();
  // Free scheduled services in order: how many this bike has already had.
  const free = (types ?? []).filter((t) => t.is_free && t.interval_days != null).map((t) => t.name);
  const index = free.indexOf(vehicle.next_service_type);
  const step = index === -1 ? free.length : index;
  const progress = free.length ? Math.round((step / free.length) * 100) : 100;
  return (
    <Card className="gap-4">
      <CardHeader>
        <div className="flex items-start gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Motorbike className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle className="text-base">{vehicle.model}</CardTitle>
            <span className="plate">{vehicle.registration_number}</span>
          </div>
        </div>
        <CardAction>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Bike actions">
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDialog("book")}>
                <CalendarPlus /> Book service
              </DropdownMenuItem>
              {/* A walk-in: the bike came in without a booking. */}
              <DropdownMenuItem disabled={!!booking} onClick={() => setDialog("service")}>
                <Wrench /> Record service (walk-in)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDialog("edit")}>
                <Pencil /> Edit bike
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
                <Trash2 /> Delete bike
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {vehicle.bought_elsewhere ? (
            <Detail label="Bought from">
              <span className="block truncate" title={vehicle.dealer_name ?? undefined}>{vehicle.dealer_name || "Another dealer"}</span>
              {vehicle.purchase_date && <span className="text-xs text-muted-foreground">{formatDate(vehicle.purchase_date, "d MMM yy")}</span>}
            </Detail>
          ) : (
            <Detail label="Purchased">{vehicle.purchase_date ? formatDate(vehicle.purchase_date, "d MMM yy") : "Not known"}</Detail>
          )}
          <Detail label="Odometer">{formatKm(vehicle.odometer_km)}</Detail>
          <Detail label="Last service">{vehicle.last_service_date ? formatDate(vehicle.last_service_date, "d MMM yy") : "Never"}</Detail>
        </div>
        {(vehicle.frame_number || vehicle.engine_number) && (
          <div className="grid grid-cols-2 gap-3">
            {vehicle.frame_number && <Detail label="Frame no."><span className="font-mono text-xs">{vehicle.frame_number}</span></Detail>}
            {vehicle.engine_number && <Detail label="Engine no."><span className="font-mono text-xs">{vehicle.engine_number}</span></Detail>}
          </div>
        )}
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Next service</p>
              <p className="text-sm font-medium">{vehicle.next_service_type}</p>
            </div>
            {booking ? (
              <Badge className="bg-primary/10 text-primary">Booked {formatDay(booking.appointment_date)}</Badge>
            ) : vehicle.next_due_pending ? (
              <OilChangeBadge />
            ) : (
              <DueBadge date={vehicle.next_service_date} serviceType={vehicle.next_service_type} />
            )}
          </div>
          <Progress value={progress} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            {vehicle.next_due_pending ? "Date set at the oil change" : `Due ${formatDay(vehicle.next_service_date)}`} · {step < free.length ? `${step} of ${free.length} free services done` : "Free services completed"}
          </p>
          {!booking && (
            <Button variant="outline" size="sm" className="mt-1 w-full" onClick={() => setDialog("service")}>
              <Wrench /> Record service (walk-in)
            </Button>
          )}
        </div>
        <ServiceHistory vehicleId={vehicle.id} subtitle={`${customer.name} · ${vehicle.model} ${vehicle.registration_number}`} />
      </CardContent>
      {dialog === "edit" && <VehicleDialog open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} vehicle={vehicle} />}
      {dialog === "book" && <AppointmentDialog open={dialog === "book"} onOpenChange={(o) => !o && setDialog(null)} customerId={customer.id} vehicleId={vehicle.id} />}
      {dialog === "service" && (
        <CloseServiceDialog open={dialog === "service"} onOpenChange={(o) => !o && setDialog(null)} walkIn={vehicle} subtitle={customer.name} />
      )}
      {dialog === "delete" && <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Delete ${vehicle.model} (${vehicle.registration_number})?`}
        description="The bike, its bookings and its service history (with the report PDFs) are deleted. Call history is kept."
        confirmLabel="Delete bike"
        destructive
        onConfirm={() => remove.mutate(vehicle.id)}
      />}
    </Card>
  );
}

function CustomerProfile() {
  const params = useSearchParams();
  const id = Number(params.get("id")) || null;
  const router = useRouter();
  const { data: customer, isLoading, error } = useCustomer(id);
  const remove = useDeleteCustomer();
  const swap = useUpdateCustomer();
  const [dialog, setDialog] = useState<"edit" | "book" | "log" | "bike" | "delete" | null>(null);

  if (isLoading || !id) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-60 rounded-xl" />
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    );
  }
  if (error || !customer) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>Customer not found</EmptyTitle>
          <EmptyDescription>They may have been deleted.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link href="/customers/">
              <ArrowLeft /> Back to customers
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const upcoming = customer.appointments.filter((a) => a.state === "upcoming");
  const completed = customer.appointments.filter((a) => a.state === "completed").length;
  const nextBike = [...customer.vehicles].sort((a, b) => a.next_service_date.localeCompare(b.next_service_date))[0];
  const subtitle = nextBike
    ? `${nextBike.model} · ${nextBike.next_service_type} ${nextBike.next_due_pending ? "after the oil change" : `due ${formatDay(nextBike.next_service_date)}`}`
    : undefined;

  return (
    <>
      <Card className="py-5">
        <CardContent className="flex flex-col gap-5 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <CustomerAvatar name={customer.name} className="size-14 text-base" />
            <div className="min-w-0 space-y-1">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{customer.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <a href={`tel:${customer.mobile_number}`} className="inline-flex items-center gap-1.5 hover:text-foreground" title="Main number (the agent calls this)">
                  <Phone className="size-3.5" /> {formatMobile(customer.mobile_number)}
                </a>
                {customer.alternate_mobile && (
                  <span className="inline-flex items-center gap-1.5">
                    <a href={`tel:${customer.alternate_mobile}`} className="hover:text-foreground">
                      Alt {formatMobile(customer.alternate_mobile)}
                    </a>
                    <button
                      type="button"
                      disabled={swap.isPending}
                      onClick={() =>
                        swap.mutate({
                          id: customer.id,
                          mobile_number: customer.alternate_mobile!,
                          alternate_mobile: customer.mobile_number,
                        })
                      }
                      className="rounded px-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      title="Make this the number the agent calls"
                    >
                      Make main
                    </button>
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag className="size-3.5" /> Customer since {formatDate(customer.created_at, "MMM yyyy")}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 border-t pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <Detail label="Bikes"><span className="tabular text-lg">{customer.vehicles.length}</span></Detail>
            <Detail label="Services done"><span className="tabular text-lg">{completed}</span></Detail>
            <Detail label="Calls"><span className="tabular text-lg">{customer.calls.length}</span></Detail>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:pl-2">
            <CallButton customer={customer} subtitle={subtitle} size="default" />
            <Button variant="outline" onClick={() => setDialog("book")}>
              <CalendarPlus /> Book service
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More actions">
                  <Ellipsis />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setDialog("log")}>
                  <NotebookPen /> Log a call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialog("bike")}>
                  <Plus /> Add bike
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDialog("edit")}>
                  <Pencil /> Edit details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDialog("delete")}>
                  <Trash2 /> Delete customer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {upcoming.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
          <Wrench className="size-4 text-primary" />
          <span>
            <span className="font-medium">{upcoming[0].model}</span> is booked for{" "}
            <span className="font-medium text-primary">{formatDay(upcoming[0].appointment_date)}</span> · {upcoming[0].service_type}
            {daysFromToday(upcoming[0].appointment_date) <= 1 && " · coming in soon"}
          </span>
        </div>
      )}

      <Tabs defaultValue="bikes" className="gap-4">
        <TabsList>
          <TabsTrigger value="bikes">Bikes · {customer.vehicles.length}</TabsTrigger>
          <TabsTrigger value="bookings">Service history · {customer.appointments.length}</TabsTrigger>
          <TabsTrigger value="calls">Calls · {customer.calls.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="bikes">
          {customer.vehicles.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {customer.vehicles.map((v) => (
                <BikeCard key={v.id} vehicle={v} customer={customer} />
              ))}
            </div>
          ) : (
            <Empty className="border">
              <EmptyHeader>
                <EmptyMedia variant="icon"><Motorbike /></EmptyMedia>
                <EmptyTitle>No bike yet</EmptyTitle>
                <EmptyDescription>Add the bike they bought so the agent can follow up on its services.</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button onClick={() => setDialog("bike")}><Plus /> Add bike</Button>
              </EmptyContent>
            </Empty>
          )}
        </TabsContent>

        <TabsContent value="bookings">
          <Card className="py-0">
            {customer.appointments.length ? (
              <div className="scroll-y max-h-[28rem]">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Booking</TableHead>
                      <TableHead>Bike</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.appointments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="tabular font-medium">{formatDay(a.appointment_date)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{a.id}</TableCell>
                        <TableCell>
                          <span className="plate">{a.registration_number}</span>
                        </TableCell>
                        <TableCell>{a.service_type}</TableCell>
                        <TableCell className="max-w-56 truncate text-muted-foreground">{a.notes ?? "—"}</TableCell>
                        <TableCell><AppointmentStateBadge state={a.state} /></TableCell>
                        <TableCell><AppointmentActions appointment={{ ...a, customer_name: customer.name }} showCustomerLink={false} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Empty className="py-12">
                <EmptyHeader>
                  <EmptyMedia><BookingArt /></EmptyMedia>
                  <EmptyTitle>No bookings yet</EmptyTitle>
                  <EmptyDescription>Bookings made by the agent or staff appear here.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="calls">
          <Card>
            <CardHeader>
              <CardTitle>Call history</CardTitle>
              <CardDescription>Outcomes logged by the voice agent and by staff</CardDescription>
              <CardAction>
                <Button variant="outline" size="sm" onClick={() => setDialog("log")}>
                  <NotebookPen /> Log a call
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {customer.calls.length ? (
                <div className="scroll-y max-h-[32rem] pl-1.5">
                  <ol className="relative space-y-6 border-l pl-6">
                    {customer.calls.map((c) => (
                      <li key={c.id} className="relative">
                        <span className="absolute top-1 -left-[29px] size-2.5 rounded-full border-2 border-background bg-primary ring-1 ring-primary/30" />
                        <div className="flex flex-wrap items-center gap-2">
                          <OutcomeBadge outcome={c.outcome} />
                          <span className="text-sm text-muted-foreground">{formatTimestamp(c.created_at)}</span>
                          <span className="text-xs text-muted-foreground">({parseTimestamp(c.created_at).toLocaleDateString("en-IN", { weekday: "long" })})</span>
                        </div>
                        <p className="mt-1 text-sm">
                          {c.model ? `${c.model} · ` : ""}
                          {c.callback_date ? `Call back on ${formatDay(c.callback_date)}` : c.notes ?? "No notes"}
                        </p>
                        {c.callback_date && c.notes && <p className="text-sm text-muted-foreground">{c.notes}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <Empty className="py-8">
                  <EmptyHeader>
                    <EmptyMedia><CallArt /></EmptyMedia>
                    <EmptyTitle>Not called yet</EmptyTitle>
                    <EmptyDescription>Start a call with the agent from the top of this page.</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dialog === "edit" && <CustomerDialog open={dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)} customer={customer} />}
      {dialog === "book" && <AppointmentDialog open={dialog === "book"} onOpenChange={(o) => !o && setDialog(null)} customerId={customer.id} />}
      {dialog === "bike" && <VehicleDialog open={dialog === "bike"} onOpenChange={(o) => !o && setDialog(null)} customer={customer} />}
      {dialog === "log" && <LogCallDialog open={dialog === "log"} onOpenChange={(o) => !o && setDialog(null)} customer={{ id: customer.id, name: customer.name, vehicleId: nextBike?.id }} />}
      {dialog === "delete" && <ConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(o) => !o && setDialog(null)}
        title={`Delete ${customer.name}?`}
        description="This permanently deletes the customer with their bikes, service bookings and call history."
        confirmLabel="Delete customer"
        destructive
        onConfirm={() => remove.mutate(customer.id, { onSuccess: () => router.push("/customers/") })}
      />}
    </>
  );
}

export default function CustomerPage() {
  return (
    <Suspense fallback={<Skeleton className="h-28 w-full rounded-xl" />}>
      <CustomerProfile />
    </Suspense>
  );
}
