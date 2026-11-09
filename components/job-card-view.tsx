"use client";

import { Check, FileText, Loader2, Pencil, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage, openFile } from "@/lib/api";
import { formatDay, formatKm, formatTimestamp } from "@/lib/format";
import { FEEDBACK_CHECKS, rupees } from "@/lib/job-card";
import type { ServiceHistoryItem } from "@/lib/types";

/** Opens a closed service's scanned job card PDF in a new tab. */
export function useOpenJobCard(recordId?: number) {
  const [opening, setOpening] = useState(false);
  const open = () => {
    if (recordId == null) return;
    setOpening(true);
    openFile(`/api/service-records/${recordId}/report`)
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setOpening(false));
  };
  return { opening, open };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={mono ? "truncate font-mono text-sm" : "text-sm font-medium"}>{children || "—"}</p>
    </div>
  );
}

/** Everything entered from a closed service's job card, laid out like the card:
 * the visit, the work, parts and labour with the bill, delivery checks,
 * feedback and who did it. */
export function JobCardViewDialog({
  item,
  subtitle,
  open,
  onOpenChange,
  onEdit,
}: {
  item: ServiceHistoryItem;
  subtitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}) {
  const pdf = useOpenJobCard(item.document_name ? item.id : undefined);
  const parts = item.parts ?? [];
  const labour = item.labour ?? [];
  const feedback = FEEDBACK_CHECKS.filter(({ key }) => item.feedback?.[key] !== undefined);
  const people = [
    ["Bay / technician", item.technician],
    ["Mechanic", item.mechanic],
    ["Supervisor", item.supervisor],
  ].filter(([, v]) => v);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
        <DialogHeader className="space-y-1.5 border-b p-6 pb-4">
          <DialogTitle className="flex flex-wrap items-center gap-2 text-lg">
            {item.service_type}
            {item.job_card_no && <Badge variant="secondary" className="tabular">Card {item.job_card_no}</Badge>}
            {item.job_type && <Badge variant="outline">{item.job_type}</Badge>}
          </DialogTitle>
          <DialogDescription>
            {subtitle ? `${subtitle} · ` : ""}Delivered {formatDay(item.service_date)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <Section title="Visit">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Field label="Received">{item.received_date ? formatDay(item.received_date) : null}</Field>
              <Field label="Delivered">{formatDay(item.service_date)}</Field>
              <Field label="Odometer">{item.odometer_km != null ? formatKm(item.odometer_km) : null}</Field>
              <Field label="Frame no." mono>{item.frame_number}</Field>
              <Field label="Engine no." mono>{item.engine_number}</Field>
              <Field label="Next service">
                {item.next_service_type ? `${item.next_service_type}${item.next_service_date ? ` · ${formatDay(item.next_service_date)}` : ""}` : null}
              </Field>
            </div>
          </Section>

          {(item.customer_requests || !!item.jobs_done?.length || item.work_done) && (
            <Section title="Work">
              {item.customer_requests && (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Customer asked: </span>
                  {item.customer_requests}
                </p>
              )}
              {!!item.jobs_done?.length && (
                <div className="flex flex-wrap gap-1.5">
                  {item.jobs_done.map((j) => (
                    <Badge key={j} variant="outline" className="gap-1 font-normal">
                      <Check className="size-3 text-success" /> {j}
                    </Badge>
                  ))}
                </div>
              )}
              {item.work_done && <p className="text-sm">{item.work_done}</p>}
            </Section>
          )}

          {(parts.length > 0 || labour.length > 0) && (
            <Section title="Bill">
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Item</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Rate</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parts.map((p, i) => (
                      <tr key={`p${i}`}>
                        <td className="px-3 py-2">
                          <p>{p.name}</p>
                          {(p.part_no || p.warranty) && (
                            <p className="text-xs text-muted-foreground">
                              {p.part_no && <span className="font-mono">{p.part_no}</span>}
                              {p.part_no && p.warranty && " · "}
                              {p.warranty && "Under warranty"}
                            </p>
                          )}
                        </td>
                        <td className="tabular px-3 py-2 text-right">{p.qty}</td>
                        <td className="tabular px-3 py-2 text-right">{rupees(p.amount)}</td>
                        <td className="tabular px-3 py-2 text-right">{p.warranty ? "Free" : rupees(p.qty * p.amount)}</td>
                      </tr>
                    ))}
                    {labour.map((l, i) => (
                      <tr key={`l${i}`}>
                        <td className="px-3 py-2">
                          <p>{l.description}</p>
                          <p className="text-xs text-muted-foreground">Labour</p>
                        </td>
                        <td className="px-3 py-2" />
                        <td className="px-3 py-2" />
                        <td className="tabular px-3 py-2 text-right">{rupees(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/30">
                    <tr className="text-xs text-muted-foreground">
                      <td colSpan={3} className="px-3 pt-2 text-right">Parts</td>
                      <td className="tabular px-3 pt-2 text-right">{rupees(item.parts_total)}</td>
                    </tr>
                    <tr className="text-xs text-muted-foreground">
                      <td colSpan={3} className="px-3 text-right">Labour</td>
                      <td className="tabular px-3 text-right">{rupees(item.labour_total)}</td>
                    </tr>
                    <tr className="font-semibold">
                      <td colSpan={3} className="px-3 pt-1 pb-2 text-right">Total</td>
                      <td className="tabular px-3 pt-1 pb-2 text-right">{rupees(item.amount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Section>
          )}

          {!!item.delivery_checks?.length && (
            <Section title="Checked at delivery">
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {item.delivery_checks.map((c) => (
                  <li key={c} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" /> {c}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(item.feedback?.rating || feedback.length > 0) && (
            <Section title="Customer feedback">
              <div className="flex flex-wrap gap-1.5">
                {item.feedback?.rating && <Badge>{item.feedback.rating}</Badge>}
                {feedback.map(({ key, label, yes, no }) => {
                  const ok = item.feedback![key];
                  return (
                    <Badge key={key} variant="outline" className={ok ? "gap-1 font-normal" : "gap-1 border-destructive/40 font-normal text-destructive"}>
                      {ok ? <Check className="size-3 text-success" /> : <X className="size-3" />}
                      {label}: {ok ? yes : no}
                    </Badge>
                  );
                })}
              </div>
            </Section>
          )}

          {(people.length > 0 || item.remarks) && (
            <Section title="People & remarks">
              {people.length > 0 && (
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                  {people.map(([label, value]) => (
                    <Field key={label} label={label!}>{value}</Field>
                  ))}
                </div>
              )}
              {item.remarks && <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">{item.remarks}</p>}
            </Section>
          )}

          {(item.created_by || item.updated_by) && (
            <p className="text-xs text-muted-foreground">
              {item.created_by && `Closed by ${item.created_by}`}
              {item.updated_by && ` · Last edited by ${item.updated_by}${item.updated_at ? `, ${formatTimestamp(item.updated_at)}` : ""}`}
            </p>
          )}
        </div>

        <DialogFooter className="border-t p-4 sm:justify-between">
          {onEdit ? (
            <Button variant="ghost" onClick={onEdit}>
              <Pencil /> Edit details
            </Button>
          ) : (
            <span />
          )}
          {item.document_name && (
            <Button onClick={pdf.open} disabled={pdf.opening}>
              {pdf.opening ? <Loader2 className="animate-spin" /> : <FileText />} Open scanned job card
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
