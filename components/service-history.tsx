"use client";

import { Eye, FileText, History, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ServiceArt } from "@/components/art/service";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { JobCardViewDialog, useOpenJobCard } from "@/components/job-card-view";
import { CloseServiceDialog } from "@/components/forms/lazy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatKm } from "@/lib/format";
import { rupees } from "@/lib/job-card";
import { useDeleteServiceRecord, useServiceHistory } from "@/lib/queries";
import type { ServiceHistoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";


function Entry({ item, subtitle }: { item: ServiceHistoryItem; subtitle?: string }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const remove = useDeleteServiceRecord();
  const pdf = useOpenJobCard(item.id);
  const isAdmin = user?.role === "admin" && item.id != null;
  if (item.kind === "booking") {
    return (
      <li className="relative space-y-0.5 pl-5">
        <span className="absolute top-1.5 left-0 size-2 rounded-full bg-muted-foreground/50" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <p className="text-sm font-medium">{item.service_type}</p>
          <p className="tabular text-xs text-muted-foreground">{formatDate(item.service_date, "d MMM yyyy")}</p>
        </div>
        <p className="text-xs text-muted-foreground">Earlier service · no job card recorded</p>
      </li>
    );
  }
  const summary = [
    item.odometer_km != null ? formatKm(item.odometer_km) : null,
    item.amount ? rupees(item.amount) : "No charge",
    item.job_card_no ? `Job card ${item.job_card_no}` : null,
  ].filter(Boolean);
  return (
    <li className="relative space-y-1 pl-5">
      <span className="absolute top-1.5 left-0 size-2 rounded-full bg-primary/70" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-sm font-medium">
          {item.service_type}
          {item.job_type && <Badge variant="outline" className="ml-2 align-middle text-[10px]">{item.job_type}</Badge>}
          {item.schedule === "keep" && <Badge variant="secondary" className="ml-1 align-middle text-[10px]">Schedule unchanged</Badge>}
          {item.schedule === "pending" && <Badge variant="secondary" className="ml-1 align-middle text-[10px]">Oil not changed</Badge>}
        </p>
        <p className="tabular text-xs text-muted-foreground">{formatDate(item.service_date, "d MMM yyyy")}</p>
      </div>
      <p className="text-xs text-muted-foreground">{summary.join(" · ")}</p>
      {!!item.jobs_done?.length && <p className="text-sm">{item.jobs_done.join(", ")}</p>}
      {item.work_done && <p className="line-clamp-2 text-sm">{item.work_done}</p>}

      {/* One row, equal widths: View · Job card · Edit, and Delete (admins). */}
      <div className={cn("grid gap-1.5 pt-1", isAdmin ? "grid-cols-[1fr_1fr_1fr_auto]" : "grid-cols-3")}>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setOpen(true)}>
          <Eye /> View
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8"
          disabled={!item.document_name || pdf.opening}
          title={item.document_name ? "Open the scanned job card" : "No job card PDF for this service"}
          onClick={pdf.open}
        >
          {pdf.opening ? <Loader2 className="animate-spin" /> : <FileText />} Job card
        </Button>
        <Button variant="outline" size="sm" className="h-8" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            size="icon"
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete this service"
            title="Delete this service"
            onClick={() => setDeleting(true)}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {open && (
        <JobCardViewDialog
          item={item}
          subtitle={subtitle}
          open={open}
          onOpenChange={setOpen}
          onEdit={() => {
            setOpen(false);
            setEditing(true);
          }}
        />
      )}
      {deleting && item.id != null && (
        <ConfirmDialog
          open={deleting}
          onOpenChange={setDeleting}
          title="Delete this service?"
          description={`The ${item.service_type} of ${formatDate(item.service_date)} and its job card PDF are deleted. Its booking becomes upcoming again (so it can be closed again), and the bike goes back to its due service.`}
          confirmLabel="Delete service"
          destructive
          onConfirm={() => remove.mutate(item.id!)}
        />
      )}
      {editing && <CloseServiceDialog open={editing} onOpenChange={setEditing} record={item} subtitle={subtitle} />}
    </li>
  );
}

/** A bike's service history (newest first), shown on its card. */
export function ServiceHistory({ vehicleId, subtitle }: { vehicleId: number; subtitle?: string }) {
  const { data, isLoading } = useServiceHistory(vehicleId);
  const items = data ?? [];
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <History className="size-3.5" /> Service history{items.length ? ` (${items.length})` : ""}
      </p>
      {isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <ServiceArt className="h-20" />
          <p className="text-sm text-muted-foreground">No services yet. Close a booking to record one.</p>
        </div>
      ) : (
        // Every service, newest first, scrolling inside the card so the card
        // keeps its height however many services (or open details) there are.
        <ul className="scroll-y max-h-80 space-y-4 pr-2">
          {items.map((item) => (
            <Entry key={item.kind === "record" ? `r${item.id}` : `b${item.appointment_id}`} item={item} subtitle={subtitle} />
          ))}
        </ul>
      )}
    </div>
  );
}
