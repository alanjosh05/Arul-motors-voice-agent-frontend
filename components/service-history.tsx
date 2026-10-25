"use client";

import { ChevronDown, FileText, History, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, openFile } from "@/lib/api";
import { formatDate, formatKm } from "@/lib/format";
import { FEEDBACK_CHECKS, rupees } from "@/lib/job-card";
import { useServiceHistory } from "@/lib/queries";
import type { ServiceHistoryItem } from "@/lib/types";
import { cn } from "@/lib/utils";

const SHOWN = 3; // newest services shown before "Show all"

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function Entry({ item }: { item: ServiceHistoryItem }) {
  const [opening, setOpening] = useState(false);
  const [open, setOpen] = useState(false);
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
      </div>
    </li>
  );
}

/** A bike's service history (newest first), shown on its card. */
export function ServiceHistory({ vehicleId }: { vehicleId: number }) {
  const { data, isLoading } = useServiceHistory(vehicleId);
  const [all, setAll] = useState(false);
  const items = data ?? [];
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <History className="size-3.5" /> Service history{items.length ? ` (${items.length})` : ""}
      </p>
      {isLoading ? (
        <Skeleton className="h-14 w-full" />
      ) : items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wrench className="size-4" /> No services yet. Close a booking to record one.
        </p>
      ) : (
        <>
          <ul className="space-y-4">
            {(all ? items : items.slice(0, SHOWN)).map((item) => (
              <Entry key={item.kind === "record" ? `r${item.id}` : `b${item.appointment_id}`} item={item} />
            ))}
          </ul>
          {items.length > SHOWN && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setAll((v) => !v)}>
              {all ? "Show less" : `Show all ${items.length}`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
