"use client";

import { useEffect, useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { FormDialog } from "@/components/forms/form-dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OUTCOME_LABELS, todayISO } from "@/lib/format";
import { useLogCall } from "@/lib/queries";
import type { CallOutcome } from "@/lib/types";

const OUTCOMES = Object.keys(OUTCOME_LABELS) as CallOutcome[]; // "no_answer" is last

/** Record the result of a call staff made themselves. */
export function LogCallDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: { id: number; name: string; vehicleId?: number };
}) {
  const [outcome, setOutcome] = useState<CallOutcome>("date_confirmed");
  const [callback, setCallback] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const log = useLogCall();

  useEffect(() => {
    if (!open) return;
    setOutcome("date_confirmed");
    setCallback(null);
    setNotes("");
    setError("");
  }, [open]);

  if (!customer) return null;
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Log a call"
      description={`Record the outcome of your call with ${customer.name}.`}
      submitLabel="Save outcome"
      pending={log.isPending}
      onSubmit={() => {
        if (outcome === "callback_requested" && !callback) return setError("Pick when to call back.");
        log
          .mutateAsync({
            customer_id: customer.id,
            vehicle_id: customer.vehicleId ?? null,
            outcome,
            callback_date: outcome === "callback_requested" ? callback : null,
            notes: notes.trim() || null,
          })
          .then(() => onOpenChange(false))
          .catch(() => {});
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Outcome</FieldLabel>
          <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OUTCOMES.map((o) => (
                <SelectItem key={o} value={o}>
                  {OUTCOME_LABELS[o]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {outcome === "callback_requested" && (
          <Field data-invalid={!!error}>
            <FieldLabel>Call back on</FieldLabel>
            <DatePicker value={callback} onChange={setCallback} min={todayISO()} invalid={!!error} />
            <FieldError>{error}</FieldError>
          </Field>
        )}
        <Field>
          <FieldLabel htmlFor="l-notes">Notes</FieldLabel>
          <Textarea id="l-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth remembering" rows={3} />
        </Field>
      </FieldGroup>
    </FormDialog>
  );
}
