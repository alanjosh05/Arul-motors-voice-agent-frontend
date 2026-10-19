"use client";

import { ArrowDown, ArrowUp, CalendarClock, Ellipsis, Info, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PageHeader } from "@/components/page-header";
import { ToneBadge } from "@/components/status-badges";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useDeleteServiceType, useMoveServiceType, useServiceTypes, useUpdateServiceType } from "@/lib/queries";
import type { ServiceType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ServiceTypeDialog } from "@/components/forms/lazy";

function dueAfter(t: ServiceType) {
  if (t.interval_days == null) return null;
  const parts = [`${t.interval_days} days`];
  if (t.interval_km) parts.push(`${t.interval_km.toLocaleString("en-IN")} km`);
  return parts.join(" or ");
}

export default function ServiceTypesPage() {
  const { data, isLoading } = useServiceTypes();
  const update = useUpdateServiceType();
  const move = useMoveServiceType();
  const remove = useDeleteServiceType();
  const [editing, setEditing] = useState<ServiceType | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<ServiceType | null>(null);
  const types = data ?? [];
  const scheduled = types.filter((t) => t.active && t.interval_days != null).length;

  return (
    <>
      <PageHeader
        title="Service types"
        description={
          data
            ? `${types.filter((t) => t.active).length} active · ${scheduled} in the service schedule`
            : "The services the workshop offers."
        }
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add service type
          </Button>
        }
      />

      <Alert>
        <Info />
        <AlertDescription>
          Types with a <span className="font-medium text-foreground">due after</span> interval form the service schedule, in the order below.
          When the workshop marks a bike serviced, the CRM suggests the next scheduled type and its due date, and the voice agent follows up when it's due.
        </AlertDescription>
      </Alert>

      <Card className="py-0">
        {isLoading ? (
          <div className="space-y-3 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : types.length ? (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due after</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead>In use</TableHead>
                <TableHead>Active</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((t, i) => (
                <TableRow key={t.id} className={cn(!t.active && "text-muted-foreground")}>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon-xs" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ id: t.id, direction: "up" })} aria-label={`Move ${t.name} up`}>
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon-xs" disabled={i === types.length - 1 || move.isPending} onClick={() => move.mutate({ id: t.id, direction: "down" })} aria-label={`Move ${t.name} down`}>
                        <ArrowDown />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-80">
                    <div className="flex items-center gap-3">
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", t.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        <Wrench className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className={cn("font-medium", t.active && "text-foreground")}>{t.name}</p>
                        {t.description && <p className="truncate text-xs text-muted-foreground">{t.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {t.is_free ? <ToneBadge tone="green">Free</ToneBadge> : <ToneBadge tone="blue">Paid</ToneBadge>}
                  </TableCell>
                  <TableCell>
                    {dueAfter(t) ? (
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        <CalendarClock className="size-3.5 text-muted-foreground" /> {dueAfter(t)}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">On demand</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular text-right text-sm">
                    {t.is_free ? "—" : t.price != null ? `₹${t.price.toLocaleString("en-IN")}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="tabular text-sm">
                          {t.bikes_due} <span className="text-muted-foreground">bikes</span> · {t.bookings}{" "}
                          <span className="text-muted-foreground">bookings</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t.bikes_due} bike(s) have this as their next service · {t.bookings} booking(s) used it
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={t.active}
                      onCheckedChange={(active) => update.mutate({ id: t.id, active })}
                      aria-label={`${t.name} active`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`${t.name} actions`}>
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing(t)}>
                          <Pencil /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => setDeleting(t)}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Empty className="py-14">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Wrench />
              </EmptyMedia>
              <EmptyTitle>No service types yet</EmptyTitle>
              <EmptyDescription>Add the services the workshop offers.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setAdding(true)}>
                <Plus /> Add service type
              </Button>
            </EmptyContent>
          </Empty>
        )}
      </Card>

      {adding && <ServiceTypeDialog open={adding} onOpenChange={setAdding} />}
      {!!editing && <ServiceTypeDialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)} serviceType={editing ?? undefined} />}
      {!!deleting && <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.name}?`}
        description={
          deleting && (deleting.bikes_due || deleting.bookings)
            ? `It's used by ${deleting.bikes_due} bike(s) and ${deleting.bookings} booking(s), so it can't be deleted. Turn off "Active" instead to hide it from new bookings.`
            : "This service type is removed. Nothing uses it yet."
        }
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />}
    </>
  );
}
