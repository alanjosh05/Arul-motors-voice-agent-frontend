"use client";

import { ChevronDown, FileText, History, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ServiceArt } from "@/components/art/service";
import { useAuth } from "@/components/auth-provider";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { CloseServiceDialog } from "@/components/forms/lazy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, openFile } from "@/lib/api";
import { formatDate, formatKm, formatTimestamp } from "@/lib/format";
import { FEEDBACK_CHECKS, rupees } from "@/lib/job-card";
import { useDeleteServiceRecord, useServiceHistory } from "@/lib/queries";
import type { ServiceHistoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";


function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function Entry({ item, subtitle }: { item: ServiceHistoryItem; subtitle?: string }) {
  const [opening, setOpening] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { user } = useAuth();
  const remove = useDeleteServiceRecord();
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
  const feedbackBits = FEEDBACK_CHECKS.filter(({ key }) => item.feedback?.[key] !== undefined).map(
    ({ key, label, yes, no }) => `${label}: ${item.feedback![key] ? yes : no}`,
  );
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

      {open && (
        <div className="space-y-1.5 rounded-lg border bg-muted/20 p-2.5">
          {item.customer_requests && <Row label="Customer asked">{item.customer_requests}</Row>}
          {item.received_date && <Row label="Received">{formatDate(item.received_date, "d MMM yyyy")}</Row>}
          {!!item.parts?.length && (
            <Row label="Parts">
              <ul className="space-y-0.5">
                {item.parts.map((p, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>
                      {p.name} {p.part_no && <span className="font-mono text-muted-foreground">({p.part_no})</span>} ×{p.qty}
                      {p.warranty && <span className="text-muted-foreground"> · warranty</span>}
                    </span>
                    <span className="tabular">{p.warranty ? "—" : rupees(p.qty * p.amount)}</span>
                  </li>
                ))}
              </ul>
            </Row>
          )}
          {!!item.labour?.length && (
            <Row label="Labour">
              <ul className="space-y-0.5">
                {item.labour.map((l, i) => (
                  <li key={i} className="flex justify-between gap-2">
                    <span>{l.description}</span>
                    <span className="tabular">{rupees(l.amount)}</span>
                  </li>
                ))}
              </ul>
            </Row>
          )}
          {(!!item.parts?.length || !!item.labour?.length) && (
            <Row label="Total">
              <span className="font-medium">
                {rupees(item.amount)}{" "}
                <span className="font-normal text-muted-foreground">(parts {rupees(item.parts_total)} + labour {rupees(item.labour_total)})</span>
              </span>
            </Row>
          )}
          {!!item.delivery_checks?.length && <Row label="Delivery checks">{item.delivery_checks.join(" · ")}</Row>}
          {(item.feedback?.rating || feedbackBits.length > 0) && (
            <Row label="Feedback">{[item.feedback?.rating, ...feedbackBits].filter(Boolean).join(" · ")}</Row>
          )}
          {(item.technician || item.mechanic || item.supervisor) && (
            <Row label="People">
              {[item.technician && `Bay/tech: ${item.technician}`, item.mechanic && `Mechanic: ${item.mechanic}`, item.supervisor && `Supervisor: ${item.supervisor}`]
                .filter(Boolean)
                .join(" · ")}
            </Row>
          )}
          {item.remarks && <Row label="Remarks">{item.remarks}</Row>}
          {item.created_by && <Row label="Closed by">{item.created_by}</Row>}
          {item.updated_by && (
            <Row label="Last edited">
              {item.updated_by}
              {item.updated_at ? ` · ${formatTimestamp(item.updated_at)}` : ""}
            </Row>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-0.5">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setOpen((v) => !v)}>
          <ChevronDown className={cn("transition-transform", open && "rotate-180")} /> {open ? "Hide details" : "Details"}
        </Button>
        {item.id != null && item.document_name && (
          <Button
            variant="outline"
            size="sm"
            className="h-7"
            disabled={opening}
            onClick={() => {
              setOpening(true);
              openFile(`/api/service-records/${item.id}/report`)
                .catch((e) => toast.error(errorMessage(e)))
                .finally(() => setOpening(false));
            }}
          >
            <FileText /> Job card
          </Button>
        )}
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setEditing(true)}>
          <Pencil /> Edit
        </Button>
        {user?.role === "admin" && item.id != null && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive hover:text-destructive" onClick={() => setDeleting(true)}>
            <Trash2 /> Delete
          </Button>
        )}
      </div>
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
