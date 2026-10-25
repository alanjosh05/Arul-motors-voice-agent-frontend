"use client";

import { FileText, History, Wrench } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage, openFile } from "@/lib/api";
import { formatDate, formatKm } from "@/lib/format";
import { useServiceHistory } from "@/lib/queries";
import type { ServiceHistoryItem } from "@/lib/types";

const SHOWN = 3; // newest services shown before "Show all"

function Entry({ item }: { item: ServiceHistoryItem }) {
  const [opening, setOpening] = useState(false);
  const details = [
    item.odometer_km != null ? formatKm(item.odometer_km) : null,
    item.amount != null ? (item.amount === 0 ? "Free" : `₹${item.amount.toLocaleString("en-IN")}`) : null,
    item.technician ? `by ${item.technician}` : null,
  ].filter(Boolean);
  return (
    <li className="relative space-y-1 pl-5">
      <span className="absolute top-1.5 left-0 size-2 rounded-full bg-primary/70" />
      <div className="flex flex-wrap items-baseline justify-between gap-x-2">
        <p className="text-sm font-medium">{item.service_type}</p>
        <p className="tabular text-xs text-muted-foreground">{formatDate(item.service_date, "d MMM yyyy")}</p>
      </div>
      {item.kind === "record" ? (
        <>
          {details.length > 0 && <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>}
          {item.work_done && <p className="line-clamp-2 text-sm">{item.work_done}</p>}
          {item.parts && <p className="text-xs text-muted-foreground">Parts: {item.parts}</p>}
          {item.remarks && <p className="text-xs text-muted-foreground">Remarks: {item.remarks}</p>}
          {item.id != null && item.document_name && (
            <Button
              variant="outline"
              size="sm"
              className="mt-1 h-7"
              disabled={opening}
              onClick={() => {
                setOpening(true);
                openFile(`/api/service-records/${item.id}/report`)
                  .catch((e) => toast.error(errorMessage(e)))
                  .finally(() => setOpening(false));
              }}
            >
              <FileText /> Service report
            </Button>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">Earlier service · no details recorded</p>
      )}
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
          <ul className="space-y-3 border-l border-border/60 pl-0">
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
